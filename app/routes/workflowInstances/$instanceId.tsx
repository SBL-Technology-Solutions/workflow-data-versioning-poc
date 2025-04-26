import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/workflowInstances/$instanceId")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/workflowInstances/$instance"!</div>;
}
