import { Button } from "@/components/ui/button";
import { workflowInstancesQueryOptions } from "@/domains/workflowInstances";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/workflowInstances/")({
	component: RouteComponent,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(workflowInstancesQueryOptions());
	},
	pendingComponent: () => <div>Loading...</div>,
});

function RouteComponent() {
	const workflowInstancesQuery = useSuspenseQuery(
		workflowInstancesQueryOptions(),
	);

	return (
		<>
			<Button onClick={() => workflowInstancesQuery.refetch()}>Click me</Button>
			<pre>{JSON.stringify(workflowInstancesQuery.data, null, 2)}</pre>
		</>
	);
}
