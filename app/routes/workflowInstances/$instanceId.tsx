import { DynamicForm } from "@/components/DynamicForm";
import { latestCurrentFormDataQueryOptions } from "@/data/formDataVersions";
import { getCurrentFormQueryOptions } from "@/data/formDefinitions";
import { getWorkflowDefinitionQueryOptions } from "@/data/workflowDefinitions";
import { fetchWorkflowInstanceQueryOptions } from "@/data/workflowInstances";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/workflowInstances/$instanceId")({
	component: RouteComponent,
	loader: async ({ params, context }) => {
		const instance = context.queryClient.prefetchQuery(
			fetchWorkflowInstanceQueryOptions(params.instanceId),
		);

		return { instance };
	},
});

function RouteComponent() {
	const { instanceId } = Route.useParams();
	if (!instanceId) return <div>🌀 No workflow instance ID in URL</div>;

	const {
		data: workflowInstance,
		isLoading: isWorkflowInstanceLoading,
		isError: isWorkflowInstanceError,
	} = useSuspenseQuery(fetchWorkflowInstanceQueryOptions(instanceId));

	const {
		data: currentForm,
		isLoading: isCurrentFormLoading,
		isError: isCurrentFormError,
	} = useQuery({
		...getCurrentFormQueryOptions(
			Number(instanceId),
			workflowInstance?.currentState ?? "",
		),
		enabled: !!workflowInstance,
	});

	const {
		data: latestCurrentFormData,
		isLoading: isLatestCurrentFormDataLoading,
		isError: isLatestCurrentFormDataError,
	} = useQuery({
		...latestCurrentFormDataQueryOptions(
			Number(instanceId),
			currentForm?.formDefId ?? -1,
		),
		enabled: !!currentForm?.formDefId,
	});

	const {
		data: workflowDefinition,
		isLoading: isWorkflowDefinitionLoading,
		isError: isWorkflowDefinitionError,
	} = useQuery({
		...getWorkflowDefinitionQueryOptions(workflowInstance?.workflowDefId ?? -1),
		enabled: !!workflowInstance,
	});

	if (isWorkflowInstanceLoading) return <div>Loading...</div>;
	if (isWorkflowInstanceError)
		return <div>Error loading workflow instance</div>;
	if (!workflowInstance) return <div>No workflow found</div>;

	if (isCurrentFormLoading) return <div>Loading...</div>;
	if (isCurrentFormError) return <div>Error loading current form</div>;
	if (!currentForm || !currentForm.formDefId || !currentForm.schema)
		return <div>No form found</div>;

	if (isLatestCurrentFormDataLoading) return <div>Loading...</div>;
	if (isLatestCurrentFormDataError)
		return <div>Error loading latest current form data</div>;

	if (isWorkflowDefinitionLoading) return <div>Loading...</div>;
	if (isWorkflowDefinitionError)
		return <div>Error loading workflow definition</div>;

	if (!workflowDefinition?.machineConfig)
		return <div>No machine config found</div>;

	return (
		<div className="container mx-auto p-4">
			<h1 className="text-2xl font-bold mb-4">
				Workflow Step: {workflowInstance.currentState}
			</h1>

			<DynamicForm
				key={currentForm.formDefId}
				schema={currentForm.schema}
				initialData={latestCurrentFormData?.[0]?.data}
				workflowInstance={workflowInstance}
				formDefId={currentForm.formDefId}
				machineConfig={workflowDefinition.machineConfig}
			/>
		</div>
	);
}
