import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { getWorkflowInstancesServerFn, workflowInstance } from '../API/workflowInstance'
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient();

const workflowDefinitionFormDefinitionMap = createCollection(
  queryCollectionOptions({
    queryKey: workflowInstance.queryKeys.all(),
    queryFn: getWorkflowInstancesServerFn,
    queryClient,
    getKey: (workflowInstance) => workflowInstance.id,
  })
)

export default workflowDefinitionFormDefinitionMap;