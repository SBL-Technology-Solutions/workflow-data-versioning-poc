import { workflowDefinitions, workflowFormDefinitions } from "@/db/schema";
import type { WorkflowDefinition } from "@/types/workflow";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import z from "zod";
import { db } from "../db";

export async function getWorkflowDefinitions() {
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
	stateFormMappings: Array<{ state: string; formDefId: number }>,
) {
	// Update the workflow definition
	const result = await db
		.update(workflowDefinitions)
		.set({
			machineConfig,
			updatedAt: new Date(),
		})
		.where(eq(workflowDefinitions.id, id))
		.returning();

	if (!result.length) {
		throw new Error("Workflow definition not found");
	}

	// Delete existing form mappings for this workflow
	await db
		.delete(workflowFormDefinitions)
		.where(eq(workflowFormDefinitions.workflowDefId, id));

	// Insert new form mappings
	if (stateFormMappings.length > 0) {
		await db.insert(workflowFormDefinitions).values(
			stateFormMappings.map((mapping) => ({
				workflowDefId: id,
				formDefId: mapping.formDefId,
				state: mapping.state,
			})),
		);
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
				}) as z.ZodType<WorkflowDefinition["machineConfig"]>,
				stateFormMappings: z.array(
					z.object({
						state: z.string(),
						formDefId: z.number(),
					}),
				),
			}),
		}),
	)
	.handler(async ({ data }) => {
		console.info("Updating workflow definition");
		return updateWorkflowDefinition(
			data.data.id,
			data.data.machineConfig,
			data.data.stateFormMappings,
		);
	});
