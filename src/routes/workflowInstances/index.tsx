import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { API } from "@/data/API";

export const Route = createFileRoute("/workflowInstances/")({
	component: RouteComponent,
	loader: async ({ context }) => {
		return context.queryClient.ensureQueryData(
			API.workflowInstance.queries.getWorkflowInstancesQueryOptions(),
		);
	},
	pendingComponent: () => <div>Loading...</div>,
});

function RouteComponent() {
	const workflowInstancesQuery = useSuspenseQuery(
		API.workflowInstance.queries.getWorkflowInstancesQueryOptions(),
	);

	return (
		<>
			<h2>Workflow Instances</h2>
			<pre>{JSON.stringify(workflowInstancesQuery.data, null, 2)}</pre>
		</>
	);
}
