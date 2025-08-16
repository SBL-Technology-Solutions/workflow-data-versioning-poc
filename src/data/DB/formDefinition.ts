import { setResponseStatus } from "@tanstack/react-start/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { dbClient } from "@/db/client";
import {
	formDataVersions,
	formDefinitions,
	workflowDefinitions,
	workflowInstances,
} from "@/db/schema";
import type { FormSchema } from "@/lib/form";

/**
 * Retrieves all form definitions from the database, ordered by creation date in descending order.
 *
 * @returns An array of all form definitions ordered by creation date
 */
const getFormDefinitions = async () => {
	return await dbClient
		.select()
		.from(formDefinitions)
		.orderBy(desc(formDefinitions.createdAt));
};

/**
 * Retrieves the latest form definition with associated data for a given workflow instance and state.
 *
 * If no form definition with data exists for the specified instance and state, falls back to the latest form definition for the corresponding workflow definition and state.
 *
 * @param workflowInstanceId - The ID of the workflow instance
 * @param state - The workflow state to filter form definitions by
 * @returns The latest form definition with data for the instance and state, or the latest form definition for the workflow definition and state if none exists with data
 * @throws Error if the workflow instance is not found
 */
const getCurrentFormForInstance = async (
	workflowInstanceId: number,
	state: string,
) => {
	// First get the workflow instance to get its workflowDefId
	const instance = await dbClient
		.select({
			workflowDefId: workflowInstances.workflowDefId,
		})
		.from(workflowInstances)
		.where(eq(workflowInstances.id, workflowInstanceId))
		.limit(1);

	if (!instance.length) {
		throw new Error("Workflow instance not found");
	}

	// Get the latest form definition that has data for this instance and state
	const result = await dbClient
		.select({
			formDefId: formDefinitions.id,
			schema: formDefinitions.schema,
		})
		.from(formDefinitions)
		.innerJoin(
			formDataVersions,
			and(
				eq(formDataVersions.formDefId, formDefinitions.id),
				eq(formDataVersions.workflowInstanceId, workflowInstanceId),
			),
		)
		.where(
			and(
				eq(formDefinitions.workflowDefId, instance[0].workflowDefId),
				eq(formDefinitions.state, state),
			),
		)
		.orderBy(desc(formDefinitions.version))
		.limit(1);

	// If no form with data exists, fall back to getting the latest form definition
	if (!result.length) {
		return getCurrentFormForWorkflowDefId(instance[0].workflowDefId, state);
	}

	return result[0];
};

/**
 * Retrieves the latest form definition for a given workflow definition ID and state.
 * If no state is provided, uses the first state defined in the workflow definition.
 *
 * @param workflowDefId - The ID of the workflow definition
 * @param state - (Optional) The workflow state to filter by; if omitted, the first state is used
 * @returns The most recent form definition and related workflow definition info for the specified workflowDefId and state
 * @throws If no workflow definition or form definition is found for the specified workflowDefId and state
 */
const getCurrentFormForWorkflowDefId = async (
	workflowDefId: number,
	state?: string,
) => {
	// If no state is provided, use the first state in the workflow definition
	const initialStateExpr = sql`
    CASE
      WHEN array_length(${workflowDefinitions.states}, 1) > 0
      THEN ${workflowDefinitions.states}[1]
      ELSE NULL
    END
  `;

	const stateOrNull = state || null;
	const statesJoinExpr = sql`Coalesce(${stateOrNull}, ${initialStateExpr})`;

	const [result] = await dbClient
		.select({
			workflowDefId: workflowDefinitions.id,
			workflowDefName: workflowDefinitions.name,
			states: workflowDefinitions.states,
			state: formDefinitions.state,
			formDefId: formDefinitions.id,
			schema: formDefinitions.schema,
			version: formDefinitions.version,
		})
		.from(workflowDefinitions)
		.leftJoin(
			formDefinitions,
			and(
				eq(workflowDefinitions.id, formDefinitions.workflowDefId),
				eq(formDefinitions.state, statesJoinExpr),
			),
		)
		.where(eq(workflowDefinitions.id, workflowDefId))
		.orderBy(desc(formDefinitions.version))
		.limit(1);

	if (!result) {
		setResponseStatus(404);
		throw new Error(
			`No Workflow Definition found for workflowDefId: ${workflowDefId}`,
		);
	}

	if (!result.states || result.states.length === 0) {
		setResponseStatus(404);
		throw new Error(`Invalid States: ${result.states}`);
	}

	if (result.state === null) {
		setResponseStatus(404);
		throw new Error(`Invalid State: ${state}`);
	}

	return result || null;
};

// Helper: Migrate compatible form data versions to new form definition
const migrateCompatibleFormDataVersions = async (
	workflowDefId: number,
	state: string,
	schema: FormSchema,
	newFormDefId: number,
) => {
	const matchingInstances = await dbClient
		.select({
			id: workflowInstances.id,
			currentState: workflowInstances.currentState,
		})
		.from(workflowInstances)
		.where(
			and(
				eq(workflowInstances.workflowDefId, workflowDefId),
				eq(workflowInstances.currentState, state),
			),
		);

	for (const instance of matchingInstances) {
		const latestData = await dbClient
			.select({
				id: formDataVersions.id,
				formDefId: formDataVersions.formDefId,
				data: formDataVersions.data,
				version: formDataVersions.version,
			})
			.from(formDataVersions)
			.innerJoin(
				formDefinitions,
				and(
					eq(formDataVersions.formDefId, formDefinitions.id),
					eq(formDefinitions.state, state),
				),
			)
			.where(eq(formDataVersions.workflowInstanceId, instance.id))
			.orderBy(desc(formDataVersions.version))
			.limit(1);

		if (!latestData.length) continue;

		const oldData = latestData[0].data;
		const oldFields = Object.keys(oldData);
		const newFields = schema.fields.map((f) => f.name);
		const isSuperset = oldFields.every((f) => newFields.includes(f));

		if (isSuperset) {
			await dbClient.insert(formDataVersions).values({
				workflowInstanceId: instance.id,
				formDefId: newFormDefId,
				version: 1,
				data: oldData,
				patch: [],
				createdBy: "system-migration",
			});
		}
	}
};

/**
 * Creates a new version of a form definition for a given workflow definition and state.
 *
 * Determines the next version number based on existing versions, inserts the new form definition with the provided schema, and returns the inserted record's ID.
 *
 * @param workflowDefId - The ID of the workflow definition to associate with the form
 * @param state - The workflow state for which the form is defined
 * @param schema - The schema definition for the new form version
 * @returns The ID of the newly created form definition record
 */
const createFormVersion = async (
	workflowDefId: number,
	state: string,
	schema: FormSchema,
) => {
	const currentVersion = await dbClient
		.select()
		.from(formDefinitions)
		.where(
			and(
				eq(formDefinitions.workflowDefId, workflowDefId),
				eq(formDefinitions.state, state),
			),
		)
		.orderBy(desc(formDefinitions.version))
		.limit(1);

	const nextVersion = currentVersion.length ? currentVersion[0].version + 1 : 1;

	const [newFormDef] = await dbClient
		.insert(formDefinitions)
		.values({
			workflowDefId,
			state,
			version: nextVersion,
			schema,
		})
		.returning();

	// Migrate compatible form data versions
	try {
		await migrateCompatibleFormDataVersions(
			workflowDefId,
			state,
			schema,
			newFormDef.id,
		);
	} catch (error) {
		console.error("Failed to migrate form data versions:", error);
		// Consider whether to rollback the form definition creation or just log the error
		throw new Error(
			`Form version created but data migration failed: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}

	return [{ id: newFormDef.id }];
};

/**
 * Retrieves the schema for a form definition by its ID.
 *
 * @param formDefId - The ID of the form definition to retrieve the schema for
 * @returns The schema object associated with the specified form definition
 * @throws If no form definition with the given ID is found
 */
const getFormSchemaById = async (formDefId: number) => {
	const formDefinition = await dbClient
		.select()
		.from(formDefinitions)
		.where(eq(formDefinitions.id, formDefId))
		.limit(1);

	if (!formDefinition.length) {
		throw new Error(`Form definition with id ${formDefId} not found`);
	}

	return formDefinition[0].schema;
};

export const formDefinition = {
	queries: {
		getFormDefinitions,
		getCurrentFormForInstance,
		getCurrentFormForWorkflowDefId,
		getFormSchemaById,
	},
	mutations: {
		migrateCompatibleFormDataVersions,
		createFormVersion,
	},
};
