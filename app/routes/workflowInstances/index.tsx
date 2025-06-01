import { workflowInstancesQueryOptions } from "@/data/workflowInstances";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/workflowInstances/")({
	component: RouteComponent,
	loader: async ({ context }) => {
		return context.queryClient.ensureQueryData(workflowInstancesQueryOptions());
	},
	pendingComponent: () => <div>Loading...</div>,
});

function RouteComponent() {
	const workflowInstancesQuery = useSuspenseQuery(
		workflowInstancesQueryOptions(),
	);

	return (
		<>
			<h2>Workflow Instances</h2>
			<pre>{JSON.stringify(workflowInstancesQuery.data, null, 2)}</pre>
		</>
	);
}
