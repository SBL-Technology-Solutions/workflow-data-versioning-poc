import { setResponseStatus } from "@tanstack/react-start/server";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Operation } from "fast-json-patch";
import * as z from "zod";
import { dbClient } from "@/db/client";
import {
	formDataVersions,
	formDefinitions,
	workflowDefinitions,
	workflowInstances,
} from "@/db/schema";
import { ConvertToZodSchemaAndValidate, formatZodErrors } from "@/lib/form";
import { createJSONPatch } from "@/lib/jsonPatch";
import { DB } from ".";

/**
 * Retrieves the latest form data version records from the database, ordered by creation date descending.
 *
 * @returns A promise resolving to an array of the most recent form data version entries.
 */
const getFormDataVersions = async () => {
	return await dbClient
		.select()
		.from(formDataVersions)
		.orderBy(desc(formDataVersions.createdAt));
};

const getCurrentFormDataForWorkflowInstance = async (
	workflowInstanceId: number,
	state?: string,
) => {
	const stateOrNull = state || null;
	const currentStateSchema =
		DB.workflowInstance.queries.workflowInstancesSelectSchema.pick({
			currentState: true,
		}).shape.currentState;
	type CurrentState = z.infer<typeof currentStateSchema>;
	const providedStateOrCurrentState = sql<CurrentState>`Coalesce(${stateOrNull}, ${workflowInstances.currentState})`;

	const [result] = await dbClient
		.select({
			workflowInstanceId: workflowInstances.id,
			workflowInstanceCurrentState: workflowInstances.currentState,
			workflowInstanceState: providedStateOrCurrentState,
			workflowInstanceStatus: workflowInstances.status,
			workflowDefinitionId: workflowDefinitions.id,
			workflowDefinitionStates: workflowDefinitions.states,
			workflowDefinitionMachineConfig: workflowDefinitions.machineConfig,
			formDefinitionId: formDefinitions.id,
			formDefinitionSchema: formDefinitions.schema,
			data: formDataVersions.data,
			dataVersion: formDataVersions.version,
		})
		.from(workflowInstances)
		.leftJoin(
			workflowDefinitions,
			eq(workflowInstances.workflowDefId, workflowDefinitions.id),
		)
		.leftJoin(
			formDefinitions,
			and(
				eq(formDefinitions.workflowDefId, workflowDefinitions.id),
				eq(formDefinitions.state, providedStateOrCurrentState),
			),
		)
		.leftJoin(
			formDataVersions,
			and(
				eq(formDataVersions.workflowInstanceId, workflowInstanceId),
				eq(formDataVersions.formDefId, formDefinitions.id),
			),
		)
		.where(eq(workflowInstances.id, workflowInstanceId))
		.orderBy(desc(formDataVersions.version))
		.limit(1);

	if (!result) {
		setResponseStatus(404);
		throw new Error(
			`No Workflow Instance found for workflow instance: ${workflowInstanceId}`,
		);
	}

	if (!result.formDefinitionSchema) {
		setResponseStatus(404);
		throw new Error(`No schema found for this state ${state}`);
	}

	if (!result.workflowDefinitionMachineConfig) {
		setResponseStatus(404);
		throw new Error(
			`No machine configuration found for this workflow instance ${workflowInstanceId}`,
		);
	}

	if (!result.formDefinitionId) {
		setResponseStatus(404);
		throw new Error(`No form definition found for this state ${state}`);
	}

	// Throw an error if the provided state is past the currentState in the ordered array of states
	if (
		result.workflowDefinitionStates &&
		result.workflowInstanceCurrentState &&
		state
	) {
		const states = result.workflowDefinitionStates;
		const currentStateIndex = states.indexOf(
			result.workflowInstanceCurrentState,
		);
		const providedStateIndex = states.indexOf(state);

		if (providedStateIndex === -1) {
			setResponseStatus(404);
			throw new Error(
				`Provided state "${state}" is not a valid state for this workflow`,
			);
		}

		if (providedStateIndex > currentStateIndex) {
			setResponseStatus(400);
			throw new Error(
				`Provided state "${state}" is past the current state "${result.workflowInstanceCurrentState}" in the workflow`,
			);
		}
	}

	return result || null;
};

/**
 * Saves a new version of form data for a given workflow instance and form definition.
 *
 * Validates the input data against the form schema, computes a JSON patch from the previous version if it exists, and inserts the new version into the database. Returns the ID of the inserted record.
 *
 * @param workflowInstanceId - The ID of the workflow instance associated with the form data.
 * @param formDefId - The ID of the form definition for which data is being saved.
 * @param data - The form data to be saved, as a mapping of field names to string values.
 * @returns An array containing an object with the ID of the newly inserted form data version.
 * @throws If the input data fails schema validation.
 */
const saveFormData = async (
	workflowInstanceId: number,
	formDefId: number,
	data: Record<string, string>,
) => {
	let patch: Operation[] = []; // First version has no changes to patch

	// get form schema from formDefId and convert to zod schema
	const formSchema =
		await DB.formDefinition.queries.getFormSchemaById(formDefId);
	const validatedPartialData = ConvertToZodSchemaAndValidate(
		formSchema,
		data,
		true,
	);

	if (!validatedPartialData.success) {
		setResponseStatus(400);
		throw new Error(formatZodErrors(validatedPartialData));
	}

	const previousData = await dbClient
		.select()
		.from(formDataVersions)
		.where(
			and(
				eq(formDataVersions.workflowInstanceId, workflowInstanceId),
				eq(formDataVersions.formDefId, formDefId),
			),
		)
		.orderBy(desc(formDataVersions.version))
		.limit(1);

	if (previousData.length) {
		patch = createJSONPatch(previousData[0].data, data);
	}

	// Returns a plain object as the QueryResult object cannot be passed from server to client
	const result = await dbClient
		.insert(formDataVersions)
		.values({
			workflowInstanceId,
			formDefId,
			version: previousData.length ? previousData[0].version + 1 : 1,
			data,
			patch,
			createdBy: "user",
		})
		.returning();

	return result;
};

export const formDataVersion = {
	queries: {
		getFormDataVersions,
		getCurrentFormDataForWorkflowInstance,
	},
	mutations: {
		saveFormData,
	},
};
