import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import type { Operation } from "fast-json-patch";
import * as z from "zod/v4";
import { formDataVersions } from "@/db/schema";
import { ConvertToZodSchemaAndValidate, formatZodErrors } from "@/lib/form";
import { createJSONPatch } from "@/lib/jsonPatch";
import { getFormSchema } from "./formDefinitions";

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
export async function saveFormData(
	workflowInstanceId: number,
	formDefId: number,
	data: Record<string, string>,
) {
	let patch: Operation[] = []; // First version has no changes to patch

	const { dbClient } = await import("../db/client");
	// get form schema from formDefId and convert to zod schema
	const formSchema = await getFormSchema(formDefId);
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
		.returning({ id: formDataVersions.id });

	return result;
}

export const saveFormDataServerFn = createServerFn({
	method: "POST",
})
	.validator(
		z.object({
			workflowInstanceId: z.number(),
			formDefId: z.number(),
			data: z.any(),
		}),
	)
	.handler(async ({ data: { workflowInstanceId, formDefId, data } }) => {
		return saveFormData(workflowInstanceId, formDefId, data);
	});
