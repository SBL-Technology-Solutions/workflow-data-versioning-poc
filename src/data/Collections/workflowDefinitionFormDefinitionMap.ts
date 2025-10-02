import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { QueryClient } from '@tanstack/react-query';
import { API } from '../API';

const queryClient = new QueryClient();

const workflowDefinitionFormDefinitionMapCollection = createCollection(
  queryCollectionOptions({
    queryKey: API.workflowDefinitionFormDefinitionMap.queryKeys.all(),
    queryFn: API.workflowDefinitionFormDefinitionMap.queries.getWorkflowDefinitionsFormDefinitionsMap,
    queryClient,
    getKey: (workflowDefinitionFormDefinitionMapCollection) => 
      workflowDefinitionFormDefinitionMapCollection.workflowDefinitionId 
        + "_" 
        + workflowDefinitionFormDefinitionMapCollection.formDefinitionId,
  })
)

export default workflowDefinitionFormDefinitionMapCollection;