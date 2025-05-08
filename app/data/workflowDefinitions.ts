import { workflowDefinitions } from "@/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { desc } from "drizzle-orm";

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
