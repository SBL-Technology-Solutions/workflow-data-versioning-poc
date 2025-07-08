import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import type { Operation } from "fast-json-patch";
import z from "zod";
import { formDataVersions } from "@/db/schema";
import { ConvertToZodSchemaAndValidate, formatZodErrors } from "@/lib/form";
import { createJSONPatch } from "@/lib/jsonPatch";
import { getFormSchema } from "./formDefinitions";

export async function getFormDataVersions() {
	const { dbClient: db } = await import("../db");
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

export async function getLatestCurrentFormData(
	workflowInstanceId: number,
	formDefId: number,
) {
	const { dbClient: db } = await import("../db");

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

export async function saveFormData(
	workflowInstanceId: number,
	formDefId: number,
	data: Record<string, string>,
) {
	let patch: Operation[] = []; // First version has no changes to patch

	const { dbClient } = await import("../db");
	// get form schema from formDefId and convert to zod schema
	const formSchema = await getFormSchema(formDefId);
	const validatedPartialData = ConvertToZodSchemaAndValidate(
		formSchema,
		data,
		true,
	);

	if (!validatedPartialData.success) {
		throw new Error(
			`Invalid data provided: ${formatZodErrors(validatedPartialData)}`,
		);
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

export const createDataVersionServerFn = createServerFn({
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
