import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import { QueryClient } from "@tanstack/react-query";
import { API } from "../API";
import { getWorkflowDefinitionsFn } from "../API/workflowDefinition";

const queryClient = new QueryClient();

export const workflowDefinitionCollection = createCollection(
	queryCollectionOptions({
		queryKey: API.workflowDefinition.queryKeys.all(),
		queryFn: getWorkflowDefinitionsFn,
		queryClient,
		getKey: (workflowDefinition) => workflowDefinition.id,
	}),
);
