import { formDataVersions } from "@/db/schema";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import z from "zod";

export async function getFormDataVersions() {
	const { db } = await import("../db");
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
	const { db } = await import("../db");

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
