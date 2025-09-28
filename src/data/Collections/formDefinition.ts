import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { QueryClient } from "@tanstack/react-query";
import { API } from "../API";
import { getFormDefinitions } from "../API/formDefinition";

const queryClient = new QueryClient();

const formDefinition = createCollection(
  queryCollectionOptions({
    queryKey: API.formDefinition.queryKeys.all(),
    queryFn: getFormDefinitions,
    queryClient,
    getKey: (formDefinition) => formDefinition.id,
  })
);

export default formDefinition;