import { desc, eq } from "drizzle-orm";
import { dbClient } from "@/db/client";
import {
	type WorkflowDefinitionsSelect,
	workflowDefinitions,
} from "@/db/schema";

/**
 * Retrieves workflow definitions from the database, ordered by creation date in descending order.
 *
 * @returns An array of workflow definition records.
 */
const getWorkflowDefinitions = async () => {
	return await dbClient
		.select()
		.from(workflowDefinitions)
		.orderBy(desc(workflowDefinitions.createdAt));
};

/**
 * Retrieves a workflow definition by its unique ID.
 *
 * @param id - The unique identifier of the workflow definition to retrieve
 * @returns The workflow definition matching the given ID
 * @throws Error if no workflow definition with the specified ID is found
 */
const getWorkflowDefinition = async (id: WorkflowDefinitionsSelect["id"]) => {
	const [workflowDefinition] = await dbClient
		.select()
		.from(workflowDefinitions)
		.where(eq(workflowDefinitions.id, id))
		.limit(1);

	if (!workflowDefinition) {
		throw new Error("Workflow not found");
	}

	return workflowDefinition;
};

export const workflowDefinition = {
	queries: {
		getWorkflowDefinitions,
		getWorkflowDefinition,
	},
};
