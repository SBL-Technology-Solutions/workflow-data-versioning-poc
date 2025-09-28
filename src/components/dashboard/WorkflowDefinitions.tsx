import workflowDefinitonCollection from "@/data/Collections/workflowDefinitonCollection";
import { useLiveQuery } from "@tanstack/react-db";
import { Link } from "@tanstack/react-router";

export function WorkflowDefinitions() {
	
	const { data: workflowDefinitions } = useLiveQuery((q) =>
		q.from({ workflowDefinition: workflowDefinitonCollection })
	);

	return (
		<section className="mb-8">
			<h2 className="text-xl font-semibold mb-4">
				Recent Workflow Definitions
			</h2>
			{workflowDefinitions.map((wf) => (
				<div key={wf.id} className="mb-4 p-4 border rounded-lg">
					<div>
						ID:{" "}
						<Link
							to={"/admin/workflow/$workflowId/forms"}
							search={{ state: wf.machineConfig.initial }}
							params={{ workflowId: wf.id.toString() }}
							className="text-blue-500 hover:underline"
						>
							{wf.id}
						</Link>
					</div>
					<div>Name: {wf.name}</div>
					<div>Version: {wf.version}</div>
					<div>
						Machine Config:{" "}
						<pre className="text-sm bg-accent text-accent-foreground p-2 mt-2 rounded-lg">
							{JSON.stringify(wf.machineConfig, null, 2)}
						</pre>
					</div>
				</div>
			))}
		</section>
	);
}
