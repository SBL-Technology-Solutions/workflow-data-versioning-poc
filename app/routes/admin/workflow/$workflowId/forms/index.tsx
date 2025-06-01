import { FormBuilder } from "@/components/FormBuilder";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectValue,
} from "@/components/ui/select";
import { SelectTrigger } from "@/components/ui/select";
import { getCurrentFormQueryOptions } from "@/data/formDefinitions";
import { getWorkflowDefinitionQueryOptions } from "@/data/workflowDefinitions";
import { useQuery } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { z } from "zod";

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
			getWorkflowDefinitionQueryOptions(Number(params.workflowId)),
		);

		return { workflowDefinition };
	},
	validateSearch: workflowDefinitionSearchSchema,
});

function RouteComponent() {
	const { workflowId } = Route.useParams();
	if (!workflowId) return <div>🌀 No workflow ID in URL</div>;

	const { data: workflowDefinition } = useSuspenseQuery({
		...getWorkflowDefinitionQueryOptions(Number(workflowId)),
	});

	if (!workflowDefinition) {
		return <div>Workflow not found</div>;
	}

	const { state } = Route.useSearch();

	const states = Object.keys(workflowDefinition.machineConfig.states);
	const currentState = state || states[0];
	console.log("states", states, "currentState", currentState);

	const {
		data: currentForm,
		isLoading: isCurrentFormLoading,
		isError: isCurrentFormError,
	} = useQuery({
		...getCurrentFormQueryOptions(Number(workflowId), currentState),
	});
	console.log("currentForm", currentForm);

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
					<StateSelector states={states} currentState={currentState} />
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

function StateSelector({
	states,
	currentState,
}: { states: string[]; currentState: string }) {
	const navigate = useNavigate({ from: Route.fullPath });

	const handleStateChange = (newState: string) => {
		navigate({
			search: { state: newState },
		});
	};

	return (
		<div className="flex items-center gap-2 py-6">
			<span className="text-muted-foreground">State:</span>
			<Select value={currentState} onValueChange={handleStateChange}>
				<SelectTrigger className="w-[180px]">
					<SelectValue placeholder="Select state" />
				</SelectTrigger>
				<SelectContent>
					{states.map((stateOption) => (
						<SelectItem key={stateOption} value={stateOption}>
							{stateOption}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
