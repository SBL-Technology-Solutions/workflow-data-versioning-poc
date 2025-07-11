import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import type { Operation } from "fast-json-patch";
import * as z from "zod/v4";
import { formDataVersions } from "@/db/schema";
import { ConvertToZodSchemaAndValidate, formatZodErrors } from "@/lib/form";
import { createJSONPatch } from "@/lib/jsonPatch";
import { getFormSchema } from "./formDefinitions";

/**
 * Retrieves the latest five form data version records from the database, ordered by creation date descending.
 *
 * @returns A promise resolving to an array of the most recent form data version entries.
 */
export async function getFormDataVersions() {
	const { dbClient: db } = await import("../db/client");
	return await db.query.formDataVersions.findMany({
		orderBy: desc(formDataVersions.createdAt),
		limit: 5,
	});
}

export const fetchFormDataVersions = createServerFn({
	method: "GET",
}).handler(async () => {
	console.info("Fetching form data versions");
	return getFormDataVersions();
});

export const formDataVersionsQueryOptions = () => ({
	queryKey: ["formDataVersions", { limit: 5 }],
	queryFn: () => fetchFormDataVersions(),
});

/**
 * Retrieves the most recent form data version for the specified workflow instance and form definition.
 *
 * @param workflowInstanceId - The ID of the workflow instance to filter by
 * @param formDefId - The ID of the form definition to filter by
 * @returns An array containing the latest form data version record, or an empty array if none exist
 */
export async function getLatestCurrentFormData(
	workflowInstanceId: number,
	formDefId: number,
) {
	const { dbClient: db } = await import("../db/client");

	const result = await db
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
}

export const fetchLatestCurrentFormData = createServerFn({
	method: "GET",
})
	.validator(
		z.object({
			workflowInstanceId: z.number(),
			formDefId: z.number(),
		}),
	)
	.handler(async ({ data: { workflowInstanceId, formDefId } }) => {
		return getLatestCurrentFormData(workflowInstanceId, formDefId);
	});

export const latestCurrentFormDataQueryOptions = (
	workflowInstanceId: number,
	formDefId: number,
) =>
	queryOptions({
		queryKey: ["latestCurrentFormData", workflowInstanceId, formDefId],
		queryFn: () =>
			fetchLatestCurrentFormData({
				data: { workflowInstanceId, formDefId },
			}),
	});

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
