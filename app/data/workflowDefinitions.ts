import { workflowDefinitions } from "@/db/schema";
import { type WorkflowDefinition } from "@/types/workflow";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import z from "zod";

export async function getWorkflowDefinitions() {
	const { db } = await import("../db");
	return await db.query.workflowDefinitions.findMany({
		orderBy: desc(workflowDefinitions.createdAt),
		limit: 5,
	});
}

export const fetchWorkflowDefinitions = createServerFn({
	method: "GET",
}).handler(async () => {
	console.info("Fetching workflow definitions");
	return getWorkflowDefinitions();
});

export const workflowDefinitionsQueryOptions = () => ({
	queryKey: ["workflowDefinitions", { limit: 5 }],
	queryFn: () => fetchWorkflowDefinitions(),
});

export async function getWorkflowDefinition(id: number) {
	const { db } = await import("../db");
	const result = await db
		.select()
		.from(workflowDefinitions)
		.where(eq(workflowDefinitions.id, id))
		.limit(1);

	if (!result.length) {
		throw new Error("Workflow definition not found");
	}

	return result[0];
}

export const getWorkflowDefinitionServerFn = createServerFn({
	method: "GET",
})
	.validator(
		z.object({
			id: z.number(),
		}),
	)
	.handler(async ({ data: { id } }) => {
		console.info("Fetching workflow definition");
		return getWorkflowDefinition(id);
	});

export const getWorkflowDefinitionQueryOptions = (id: number) => ({
	queryKey: ["workflowDefinition", id],
	queryFn: () => getWorkflowDefinitionServerFn({ data: { id } }),
});

export async function updateWorkflowDefinition(
	id: number,
	machineConfig: WorkflowDefinition["machineConfig"],
	formDefIds: Record<string, number>,
) {
	const { db } = await import("../db");
	const result = await db
		.update(workflowDefinitions)
		.set({
			machineConfig,
			formDefIds,
			updatedAt: new Date(),
		})
		.where(eq(workflowDefinitions.id, id))
		.returning();

	if (!result.length) {
		throw new Error("Workflow definition not found");
	}

	return result[0];
}

export const updateWorkflowDefinitionServerFn = createServerFn({
	method: "POST",
})
	.validator(
		z.object({
			data: z.object({
				id: z.number(),
				machineConfig: z.object({
					id: z.string(),
					initial: z.string(),
					states: z.record(
						z.object({
							on: z.record(z.string()).optional(),
						}),
					),
				}),
				formDefIds: z.record(z.number()),
			}),
		}),
	)
	.handler(async ({ data }) => {
		console.info("Updating workflow definition");
		return updateWorkflowDefinition(
			data.id,
			data.machineConfig,
			data.formDefIds,
		);
	});
