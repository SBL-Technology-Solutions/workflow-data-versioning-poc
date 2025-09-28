import { useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import * as z from "zod";
import { FormBuilder } from "@/components/FormBuilder";
import { StateSelector } from "@/components/StateSelector";
import { API } from "@/data/API";

const workflowDefinitionSearchSchema = z.object({
	state: z.string().catch(""),
});

export const Route = createFileRoute("/admin/workflow/$workflowId/forms/")({
	component: RouteComponent,
	validateSearch: workflowDefinitionSearchSchema,
});

function RouteComponent() {
	const { workflowId } = Route.useParams();
	const { state } = useSearch({ from: "/admin/workflow/$workflowId/forms/" });
	const navigate = useNavigate();

	const { data: workflowDefinitionAndFormDefinition } = useSuspenseQuery({
		...API.formDefinition.queries.getCurrentFormDefinitionByWorkflowDefIdQueryOptions(
			Number(workflowId),
			state,
		),
	});

	const effectiveState =
		workflowDefinitionAndFormDefinition.state ?? state ?? "";

	const handleStateChange = (newState: string) => {
		navigate({
			to: "/admin/workflow/$workflowId/forms",
			params: { workflowId },
			search: { state: newState },
		});
	};

	return (
		<div className="container mx-auto p-4">
			<div className="flex justify-between items-center mb-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-bold">
						Edit Form: {workflowDefinitionAndFormDefinition.workflowDefName}
					</h1>
					<StateSelector
						states={workflowDefinitionAndFormDefinition.states ?? []}
						currentState={effectiveState}
						onStateChange={handleStateChange}
					/>
				</div>
			</div>
			<FormBuilder
				initialSchema={
					workflowDefinitionAndFormDefinition.schema ?? {
						title: "",
						fields: [],
					}
				}
				workflowId={Number(workflowId)}
				state={effectiveState}
				key={`${workflowId}-${effectiveState}-${workflowDefinitionAndFormDefinition.formDefId ?? "new"}`}
			/>
		</div>
	);
}
