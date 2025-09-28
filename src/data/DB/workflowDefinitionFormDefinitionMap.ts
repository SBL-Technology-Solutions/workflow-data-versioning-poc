import { dbClient } from "@/db/client";
import {
	workflowDefinitionsFormDefinitionsMap
} from "@/db/schema";
import { desc } from "drizzle-orm";

/**
 * Retrieves workflowDefinition-formdefinition mapping from the database,
 * ordered by creation date in descending order.
 *
 * @returns An array of workflowDefinition-formdefinition map records.
 */
const getWorkflowDefinitionsFormDefinitionsMap = async () => {
	return await dbClient
		.select()
		.from(workflowDefinitionsFormDefinitionsMap)
		.orderBy(desc(workflowDefinitionsFormDefinitionsMap.createdAt));
};

export const workflowDefinitionFormDefinitionMap = {
	queries: {
		getWorkflowDefinitionsFormDefinitionsMap
	},
};
