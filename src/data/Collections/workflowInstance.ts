import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { getWorkflowInstancesServerFn } from '../API/workflowInstance'
import { QueryClient } from '@tanstack/react-query';
import { API } from '../API';

const queryClient = new QueryClient();

const workflowInstance = createCollection(
  queryCollectionOptions({
    queryKey: API.workflowInstance.queryKeys.all(),
    queryFn: getWorkflowInstancesServerFn,
    queryClient,
    getKey: (workflowInstance) => workflowInstance.id,
  })
)

export default workflowInstance;