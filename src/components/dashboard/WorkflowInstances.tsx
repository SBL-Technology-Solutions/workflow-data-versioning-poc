import { useLiveQuery } from "@tanstack/react-db";
import { Link } from "@tanstack/react-router";
import workflowInstanceCollection from "@/data/collection/workflowInstance";

export function WorkflowInstances() {
	const { data: workflowInstances } = useLiveQuery((q) =>
		q.from({ workflowInstance: workflowInstanceCollection }),
	);

	return (
		<section className="mb-8">
			<h2 className="text-xl font-semibold mb-4">Recent Workflow Instances</h2>
			{workflowInstances.map((instance) => (
				<div key={instance.id} className="mb-4 p-4 border rounded-lg">
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
					<div>Updated At: {instance.updatedAt.toLocaleString()}</div>
					<div>Workflow Definition ID: {instance.workflowDefId}</div>
				</div>
			))}
		</section>
	);
}
