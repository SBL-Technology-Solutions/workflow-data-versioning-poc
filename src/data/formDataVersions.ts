import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import type { Operation } from "fast-json-patch";
import z from "zod";
import { formDataVersions, formDefinitions } from "@/db/schema";
import { createZodSchema } from "@/lib/form";
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

export async function createDataVersion(
	workflowInstanceId: number,
	formDefId: number,
	data: Record<string, string>,
) {
	let patch: Operation[] = []; // First version has no changes to patch

	const { dbClient } = await import("../db");
	// get form schema from formDefId and convert to zod schema
	const formSchema = await getFormSchema(formDefId);
	const zodSchema = createZodSchema(formSchema);
	const partialZodSchema = zodSchema.partial();
	const parsedData = partialZodSchema.safeParse(data);

	if (!parsedData.success) {
		const messages = parsedData.error.issues.map((error) => {
			const path = error.path.join(".") || "<root>";
			return `${path}: ${error.message}`;
		});
		throw new Error(`Invalid data provided: ${messages.join(", ")}`);
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
		return createDataVersion(workflowInstanceId, formDefId, data);
	});

// Fetch the latest form data version for a workflowInstanceId and state, regardless of formDefId
export async function getLatestFormDataForInstanceState(
	workflowInstanceId: number,
	state: string,
) {
	const { dbClient: db } = await import("../db");
	// Join formDataVersions with formDefinitions to filter by state
	const result = await db
		.select({
			id: formDataVersions.id,
			formDefId: formDataVersions.formDefId,
			version: formDataVersions.version,
			data: formDataVersions.data,
			createdAt: formDataVersions.createdAt,
		})
		.from(formDataVersions)
		.innerJoin(
			formDefinitions,
			and(
				eq(formDataVersions.formDefId, formDefinitions.id),
				eq(formDefinitions.state, state),
			),
		)
		.where(eq(formDataVersions.workflowInstanceId, workflowInstanceId))
		.orderBy(desc(formDataVersions.version))
		.limit(1);
	return result;
}

export const fetchLatestFormDataForInstanceState = createServerFn({
	method: "GET",
})
	.validator(
		z.object({
			workflowInstanceId: z.number(),
			state: z.string(),
		}),
	)
	.handler(async ({ data: { workflowInstanceId, state } }) => {
		return getLatestFormDataForInstanceState(workflowInstanceId, state);
	});

export const latestFormDataForInstanceStateQueryOptions = (
	workflowInstanceId: number,
	state: string,
) =>
	queryOptions({
		queryKey: ["latestFormDataForInstanceState", workflowInstanceId, state],
		queryFn: () =>
			fetchLatestFormDataForInstanceState({
				data: { workflowInstanceId, state },
			}),
	});
