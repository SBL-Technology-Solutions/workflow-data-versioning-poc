import { workflowInstancesQueryOptions } from "@/domains/workflowInstances";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: Home,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(workflowInstancesQueryOptions());
	},
	pendingComponent: () => <div>Loading...</div>,
});

function Home() {
	const workflowInstancesQuery = useSuspenseQuery(
		workflowInstancesQueryOptions(),
	);

	return <pre>{JSON.stringify(workflowInstancesQuery.data, null, 2)}</pre>;
}
