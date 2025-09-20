import { setResponseStatus } from "@tanstack/react-start/server";
import { and, desc, eq, sql } from "drizzle-orm";
import type { DbTransaction } from "@/db/client";
import { dbClient } from "@/db/client";
import {
	type FormDefinitionsSelect,
	formDataVersions,
	formDefinitions,
	type WorkflowDefinitionsSelect,
	workflowDefinitions,
	workflowDefinitionsFormDefinitionsMap,
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
 * Retrieves the latest form definition for a given workflow definition ID and state.
 * If no state is provided, uses the first state defined in the workflow definition.
 *
 * @param workflowDefId - The ID of the workflow definition
 * @param state - (Optional) The workflow state to filter by; if omitted, the first state is used
 * @returns The most recent form definition and related workflow definition info for the specified workflowDefId and state
 * @throws If no workflow definition or form definition is found for the specified workflowDefId and state
 */
const getCurrentFormForWorkflowDefId = async (
	workflowDefId: WorkflowDefinitionsSelect["id"],
	state?: FormDefinitionsSelect["state"],
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

	const [currentFormForWorkflowDef] = await dbClient
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
			workflowDefinitionsFormDefinitionsMap,
			eq(
				workflowDefinitions.id,
				workflowDefinitionsFormDefinitionsMap.workflowDefinitionId,
			),
		)
		.leftJoin(
			formDefinitions,
			and(
				eq(
					workflowDefinitionsFormDefinitionsMap.formDefinitionId,
					formDefinitions.id,
				),
				eq(formDefinitions.state, statesJoinExpr),
			),
		)
		.where(eq(workflowDefinitions.id, workflowDefId))
		.orderBy(desc(formDefinitions.version))
		.limit(1);

	if (!currentFormForWorkflowDef) {
		setResponseStatus(404);
		throw new Error(
			`No Workflow Definition found for workflowDefId: ${workflowDefId}`,
		);
	}

	if (
		!currentFormForWorkflowDef.states ||
		currentFormForWorkflowDef.states.length === 0
	) {
		setResponseStatus(404);
		throw new Error(`Invalid States: ${currentFormForWorkflowDef.states}`);
	}

	if (currentFormForWorkflowDef.state === null) {
		setResponseStatus(404);
		throw new Error(`Invalid State: ${state}`);
	}

	return currentFormForWorkflowDef || null;
};

// Helper: Migrate compatible form data versions to new form definition
const migrateCompatibleFormDataVersions = async (
	tx: DbTransaction,
	workflowDefId: WorkflowDefinitionsSelect["id"],
	state: FormDefinitionsSelect["state"],
	schema: FormSchema,
	newFormDefId: FormDefinitionsSelect["id"],
) => {
	const matchingInstances = await tx
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
		const latestData = await tx
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
			await tx.insert(formDataVersions).values({
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
	workflowDefId: WorkflowDefinitionsSelect["id"],
	state: FormDefinitionsSelect["state"],
	schema: FormSchema,
) => {
	const [currentVersion] = await dbClient
		.select({
			id: formDefinitions.id,
			version: formDefinitions.version,
		})
		.from(formDefinitions)
		.innerJoin(
			workflowDefinitionsFormDefinitionsMap,
			and(
				eq(
					formDefinitions.id,
					workflowDefinitionsFormDefinitionsMap.formDefinitionId,
				),
				eq(
					workflowDefinitionsFormDefinitionsMap.workflowDefinitionId,
					workflowDefId,
				),
			),
		)
		.where(eq(formDefinitions.state, state))
		.orderBy(desc(formDefinitions.version))
		.limit(1);

	const nextVersion = currentVersion ? currentVersion.version + 1 : 1;

	const result = await dbClient.transaction(async (tx) => {
		if (currentVersion) {
			await tx
				.update(formDefinitions)
				.set({
					isCurrent: false,
				})
				.where(eq(formDefinitions.id, currentVersion.id));
		}

		const [newFormDef] = await tx
			.insert(formDefinitions)
			.values({
				state,
				version: nextVersion,
				schema,
				//TODO: Remove system when we have users setup
				createdBy: "system",
				isCurrent: true,
			})
			.returning();

		await tx.insert(workflowDefinitionsFormDefinitionsMap).values({
			workflowDefinitionId: workflowDefId,
			formDefinitionId: newFormDef.id,
			createdBy: "system",
			updatedBy: "system",
		});

		// Migrate compatible form data versions
		try {
			await migrateCompatibleFormDataVersions(
				tx,
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
	});
	return result;
};

/**
 * Retrieves the schema for a form definition by its ID.
 *
 * @param formDefId - The ID of the form definition to retrieve the schema for
 * @returns The schema object associated with the specified form definition
 * @throws If no form definition with the given ID is found
 */
const getFormDefinitionById = async (
	formDefId: FormDefinitionsSelect["id"],
) => {
	const [formDefinition] = await dbClient
		.select()
		.from(formDefinitions)
		.where(eq(formDefinitions.id, formDefId))
		.limit(1);

	if (!formDefinition) {
		setResponseStatus(404);
		throw new Error(`Form definition with id ${formDefId} not found`);
	}

	return formDefinition;
};

export const formDefinition = {
	queries: {
		getFormDefinitions,
		getCurrentFormForWorkflowDefId,
		getFormDefinitionById,
	},
	mutations: {
		migrateCompatibleFormDataVersions,
		createFormVersion,
	},
};
