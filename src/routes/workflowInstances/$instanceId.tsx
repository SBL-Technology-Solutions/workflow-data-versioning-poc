import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import * as z from "zod/v4";
import { DynamicForm } from "@/components/DynamicForm";
import { StateSelector } from "@/components/StateSelector";
import { latestCurrentFormDataQueryOptions } from "@/data/formDataVersions";
import { getCurrentFormForInstanceQueryOptions } from "@/data/formDefinitions";
import { getWorkflowDefinitionQueryOptions } from "@/data/workflowDefinitions";
import { fetchWorkflowInstanceQueryOptions } from "@/data/workflowInstances";

const workflowInstanceSearchSchema = z.object({
	state: z.string().catch(""),
});
type WorkflowInstanceSearchSchema = z.infer<
	typeof workflowInstanceSearchSchema
>;

export const Route = createFileRoute("/workflowInstances/$instanceId")({
	component: RouteComponent,
	validateSearch: workflowInstanceSearchSchema,
	loader: async ({ params, context }) => {
		const instance = context.queryClient.prefetchQuery(
			fetchWorkflowInstanceQueryOptions(params.instanceId),
		);

		return { instance };
	},
});

function RouteComponent() {
	const { instanceId } = Route.useParams();
	const { state } = useSearch({ from: "/workflowInstances/$instanceId" });
	const navigate = useNavigate();

	const {
		data: workflowInstance,
		isLoading: isWorkflowInstanceLoading,
		isError: isWorkflowInstanceError,
	} = useSuspenseQuery(fetchWorkflowInstanceQueryOptions(instanceId || ""));

	const {
		data: workflowDefinition,
		isLoading: isWorkflowDefinitionLoading,
		isError: isWorkflowDefinitionError,
	} = useQuery({
		...getWorkflowDefinitionQueryOptions(workflowInstance?.workflowDefId ?? -1),
		enabled: !!workflowInstance,
	});

	// Get all possible states from the machine config
	const allStates = Object.keys(
		workflowDefinition?.machineConfig?.states || {},
	);
	// Only allow selection of states up to the current state
	const availableStates = allStates.slice(
		0,
		allStates.indexOf(workflowInstance?.currentState || "") + 1,
	);

	const currentState = state || workflowInstance?.currentState || "";

	const handleStateChange = (newState: string) => {
		navigate({
			to: "/workflowInstances/$instanceId",
			params: { instanceId: instanceId || "" },
			search: { state: newState },
		});
	};

	const {
		data: currentForm,
		isLoading: isCurrentFormLoading,
		isError: isCurrentFormError,
	} = useQuery({
		...getCurrentFormForInstanceQueryOptions(
			Number(instanceId || "0"),
			currentState,
		),
		enabled: !!workflowInstance,
	});

	const {
		data: latestCurrentFormData,
		isLoading: isLatestCurrentFormDataLoading,
		isError: isLatestCurrentFormDataError,
	} = useQuery({
		...latestCurrentFormDataQueryOptions(
			Number(instanceId || "0"),
			currentForm?.formDefId ?? -1,
		),
		enabled: !!currentForm?.formDefId,
	});

	// Early returns after all hooks are called
	if (!instanceId) return <div>🌀 No workflow instance ID in URL</div>;
	if (isWorkflowInstanceLoading) return <div>Loading...</div>;
	if (isWorkflowInstanceError)
		return <div>Error loading workflow instance</div>;
	if (!workflowInstance) return <div>No workflow found</div>;

	if (isWorkflowDefinitionLoading) return <div>Loading...</div>;
	if (isWorkflowDefinitionError)
		return <div>Error loading workflow definition</div>;
	if (!workflowDefinition?.machineConfig)
		return <div>No machine config found</div>;

	console.log("currentState", currentState);

	if (isCurrentFormLoading) return <div>Loading...</div>;
	if (isCurrentFormError) return <div>Error loading current form</div>;
	if (!currentForm || !currentForm.formDefId || !currentForm.schema)
		return <div>No form found</div>;

	if (isLatestCurrentFormDataLoading) return <div>Loading...</div>;
	if (isLatestCurrentFormDataError)
		return <div>Error loading latest current form data</div>;

	return (
		<div className="container mx-auto p-4">
			<div className="flex justify-between items-center mb-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-bold">Workflow Step: {currentState}</h1>
					<StateSelector
						states={availableStates}
						currentState={currentState}
						onStateChange={handleStateChange}
					/>
				</div>
			</div>

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
