import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import * as z from "zod/v4";
import { workflowDefinitions } from "@/db/schema";

export async function getWorkflowDefinitions() {
	const { dbClient: db } = await import("../db");
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
	const { dbClient: db } = await import("../db");
	const workflows = await db
		.select()
		.from(workflowDefinitions)
		.where(eq(workflowDefinitions.id, id))
		.limit(1);

	if (!workflows.length) {
		throw new Error("Workflow not found");
	}

	return workflows[0];
}

export const getWorkflowDefinitionServerFn = createServerFn({
	method: "GET",
})
	.validator(z.object({ id: z.number() }))
	.handler(async ({ data: { id } }) => getWorkflowDefinition(id));

export const getWorkflowDefinitionQueryOptions = (id: number) =>
	queryOptions({
		queryKey: ["workflowDefinition", id],
		queryFn: () => getWorkflowDefinitionServerFn({ data: { id } }),
	});
