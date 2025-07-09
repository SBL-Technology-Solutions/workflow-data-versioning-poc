import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { API } from "@/data/API";

export function WorkflowInstances() {
	const workflowInstancesQuery = useSuspenseQuery(
		API.workflowInstance.queries.getWorkflowInstancesQueryOptions(),
	);

	return (
		<section className="mb-8">
			<h2 className="text-xl font-semibold mb-4">Recent Workflow Instances</h2>
			{workflowInstancesQuery.data.map((instance) => (
				<div key={instance.id} className="mb-4 p-4 border rounded">
					<div>
						ID:{" "}
						<Link
							to={"/workflowInstances/$instanceId"}
							params={{ instanceId: instance.id.toString() }}
							search={{ state: instance.currentState }}
							className="text-blue-500 hover:underline"
						>
							{instance.id}
						</Link>
					</div>
					<div>Current State: {instance.currentState}</div>
					<div>Status: {instance.status}</div>
					<div>Workflow Definition ID: {instance.workflowDefId}</div>
				</div>
			))}
		</section>
	);
}
