import { createServerFn } from "@tanstack/react-start";
import { DB } from "../DB";

const formDefinitionQueryKeys = {
	all: () => ["workflowDefinitionsFormDefinitions"] as const,
} as const;

export const getWorkflowDefinitionsFormDefinitionsMap = createServerFn({
	method: "GET",
}).handler(async () => {
	return DB.workflowDefinitionFormDefinitionMap
		.queries.getWorkflowDefinitionsFormDefinitionsMap();
});

export const workflowDefinitionFormDefinitionMap = {
	queries: {
		getWorkflowDefinitionsFormDefinitionsMap,
	},
	queryKeys: formDefinitionQueryKeys,
};
