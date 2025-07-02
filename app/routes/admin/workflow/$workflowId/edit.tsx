import { WorkflowEditor } from "@/components/WorkflowEditor";
import { getWorkflowDefinitionQueryOptions } from "@/data/workflowDefinitions";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/workflow/$workflowId/edit")({
	component: RouteComponent,
	loader: async ({ params, context }) => {
		const workflowDefinition = context.queryClient.prefetchQuery(
			getWorkflowDefinitionQueryOptions(Number(params.workflowId)),
		);

		return { workflowDefinition };
	},
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

	return (
		<div className="container mx-auto p-4">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold">
					Edit Workflow: {workflowDefinition.name}
				</h1>
			</div>
			<WorkflowEditor workflowDefinition={workflowDefinition} />
		</div>
	);
}
