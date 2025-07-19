import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import * as z from "zod/v4";
import { FormBuilder } from "@/components/FormBuilder";
import { StateSelector } from "@/components/StateSelector";
import { API } from "@/data/API";
import { getCurrentFormForDefinitionQueryOptions } from "@/data/formDefinitions";

const workflowDefinitionSearchSchema = z.object({
	state: z.string().catch(""),
});
type WorkflowDefinitionSearchSchema = z.infer<
	typeof workflowDefinitionSearchSchema
>;

export const Route = createFileRoute("/admin/workflow/$workflowId/forms/")({
	component: RouteComponent,
	loader: async ({ params, context }) => {
		const workflowDefinition = context.queryClient.prefetchQuery(
			API.workflowDefinition.queries.getWorkflowDefinitionbyIdQueryOptions(
				Number(params.workflowId),
			),
		);

		return { workflowDefinition };
	},
	validateSearch: workflowDefinitionSearchSchema,
});

function RouteComponent() {
	const { workflowId } = Route.useParams();
	const { state } = useSearch({ from: "/admin/workflow/$workflowId/forms/" });
	const navigate = useNavigate();
	if (!workflowId) return <div>🌀 No workflow ID in URL</div>;

	const { data: workflowDefinition } = useSuspenseQuery({
		...API.workflowDefinition.queries.getWorkflowDefinitionbyIdQueryOptions(
			Number(workflowId),
		),
	});

	if (!workflowDefinition) {
		return <div>Workflow not found</div>;
	}

	const states = Object.keys(workflowDefinition.machineConfig.states);
	const currentState = state || states[0];

	const handleStateChange = (newState: string) => {
		navigate({
			to: "/admin/workflow/$workflowId/forms",
			params: { workflowId },
			search: { state: newState },
		});
	};

	const {
		data: currentForm,
		isLoading: isCurrentFormLoading,
		isError: isCurrentFormError,
	} = useQuery({
		...getCurrentFormForDefinitionQueryOptions(
			Number(workflowId),
			currentState,
		),
	});

	if (isCurrentFormLoading) return <div>Loading...</div>;
	if (isCurrentFormError) return <div>Error loading current form</div>;
	if (!currentForm) return <div>No form found</div>;

	return (
		<div className="container mx-auto p-4">
			<div className="flex justify-between items-center mb-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-bold">
						Edit Form: {workflowDefinition.name}
					</h1>
					<StateSelector
						states={states}
						currentState={currentState}
						onStateChange={handleStateChange}
					/>
				</div>
				{/* <Link
					to="/admin/workflows"
					className="text-blue-500 hover:text-blue-700"
				>
					Back to Workflows
				</Link> */}
			</div>
			<FormBuilder
				initialSchema={
					currentForm.schema || {
						title: "",
						fields: [],
					}
				}
				workflowId={Number(workflowId)}
				state={currentState}
				key={currentForm.formDefId}
			/>
		</div>
	);
}
