import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import z from "zod";
import { formDataVersions } from "@/db/schema";
import { createJSONPatch } from "@/lib/jsonPatch";

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

export async function createDataVersion(
	workflowInstanceId: number,
	formDefId: number,
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	data: any,
) {
	console.log("workflowInstanceId: ", workflowInstanceId);
	console.log("formDefId: ", formDefId);
	console.log("data: ", data);
	let patch = data; // First version stores full data as patch

	const { dbClient: db } = await import("../db");
	const previousData = await db
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

	console.log("previousData: ", previousData);

	if (previousData.length) {
		patch = createJSONPatch(previousData[0].data, data);
	}
	console.log("patch: ", patch);

	// Returns a plain object as the QueryResult object cannot be passed from server to client
	const result = await db
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
		return createDataVersion(workflowInstanceId, formDefId, data);
	});
