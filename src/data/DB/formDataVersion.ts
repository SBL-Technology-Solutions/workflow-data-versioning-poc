import { and, desc, eq } from "drizzle-orm";
import type { Operation } from "fast-json-patch";
import { dbClient } from "@/db/client";
import { formDataVersions } from "@/db/schema";
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

/**
 * Retrieves the most recent form data version for the specified workflow instance and form definition.
 *
 * @param workflowInstanceId - The ID of the workflow instance to filter by
 * @param formDefId - The ID of the form definition to filter by
 * @returns An array containing the latest form data version record, or an empty array if none exist
 */
const getLatestCurrentFormData = async (
	workflowInstanceId: number,
	formDefId: number,
) => {
	const result = await dbClient
		.select({
			id: formDataVersions.id,
			version: formDataVersions.version,
			data: formDataVersions.data,
			patch: formDataVersions.patch,
			createdAt: formDataVersions.createdAt,
			createdBy: formDataVersions.createdBy,
		})
		.from(formDataVersions)
		.where(
			and(
				eq(formDataVersions.workflowInstanceId, workflowInstanceId),
				eq(formDataVersions.formDefId, formDefId),
			),
		)
		.orderBy(desc(formDataVersions.version))
		.limit(1);

	return result;
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
		getLatestCurrentFormData,
	},
	mutations: {
		saveFormData,
	},
};
