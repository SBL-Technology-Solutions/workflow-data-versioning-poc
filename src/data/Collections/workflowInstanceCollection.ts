import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { getWorkflowInstancesServerFn, workflowInstance } from '../API/workflowInstance'
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient();

const workflowInstanceCollection = createCollection(
  queryCollectionOptions({
    queryKey: workflowInstance.queryKeys.all(),
    queryFn: async () => {
      const response = await getWorkflowInstancesServerFn()
      return response;
    },
    queryClient,
    getKey: (workflowInstance) => workflowInstance.id,
  })
)

export default workflowInstanceCollection;