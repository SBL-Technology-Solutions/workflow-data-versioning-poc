import { createServerFn } from "@tanstack/react-start";
import { DB } from "../DB";

const workflowDefinitionFormDefinitionMapQueryKeys = {
	all: () => ["workflowDefinitionsFormDefinitionsMap"] as const,
} as const;

const getWorkflowDefinitionsFormDefinitionsMap = createServerFn({
	method: "GET",
}).handler(async () => {
	return DB.workflowDefinitionFormDefinitionMap
		.queries.getWorkflowDefinitionsFormDefinitionsMap();
});

export const workflowDefinitionFormDefinitionMap = {
	queries: {
		getWorkflowDefinitionsFormDefinitionsMap,
	},
	queryKeys: workflowDefinitionFormDefinitionMapQueryKeys,
};
