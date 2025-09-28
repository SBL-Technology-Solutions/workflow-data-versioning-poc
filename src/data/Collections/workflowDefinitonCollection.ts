import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { QueryClient } from '@tanstack/react-query';
import { getWorkflowDefinitionsFn, workflowDefinition } from '../API/workflowDefinition';

const queryClient = new QueryClient();

const workflowDefinitonCollection = createCollection(
  queryCollectionOptions({
    queryKey: workflowDefinition.queryKeys.all(),
    queryFn: getWorkflowDefinitionsFn,
    queryClient,
    getKey: (workflowDefiniton) => workflowDefiniton.id,
  })
)

export default workflowDefinitonCollection;