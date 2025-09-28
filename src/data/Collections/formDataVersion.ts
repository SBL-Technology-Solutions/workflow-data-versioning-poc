import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { QueryClient } from "@tanstack/react-query";
import { API } from "../API";
import { getFormDataVersions } from "../API/formDataVersion";

const queryClient = new QueryClient();

const formDataVersionCollection = createCollection(
  queryCollectionOptions({
    queryKey: API.formDataVersion.queryKeys.all(),
    queryFn: getFormDataVersions,
    queryClient,
    getKey: (formDataVersion) => formDataVersion.id,
  })
);

export default formDataVersionCollection;