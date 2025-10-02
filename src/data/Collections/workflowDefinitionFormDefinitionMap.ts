import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { QueryClient } from '@tanstack/react-query';
import { getWorkflowDefinitionsFormDefinitionsMap, workflowDefinitionFormDefinitionMap } from '../API/workflowDefinitionFormDefinitionMap';

const queryClient = new QueryClient();

const workflowDefinitionFormDefinitionMapCollection = createCollection(
  queryCollectionOptions({
    queryKey: workflowDefinitionFormDefinitionMap.queryKeys.all(),
    queryFn: getWorkflowDefinitionsFormDefinitionsMap,
    queryClient,
    getKey: (workflowDefinitionFormDefinitionMapCollection) => 
      workflowDefinitionFormDefinitionMapCollection.workflowDefinitionId 
        + "_" 
        + workflowDefinitionFormDefinitionMapCollection.formDefinitionId,
  })
)

export default workflowDefinitionFormDefinitionMapCollection;