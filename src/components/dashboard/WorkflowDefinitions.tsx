import { workflowDefinitionsQueryOptions } from "@/data/workflowDefinitions";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

export function WorkflowDefinitions() {
	const workflowDefinitionsQuery = useSuspenseQuery(
		workflowDefinitionsQueryOptions(),
	);

	return (
		<section className="mb-8">
			<h2 className="text-xl font-semibold mb-4">
				Recent Workflow Definitions
			</h2>
			{workflowDefinitionsQuery.data.map((wf) => (
				<div key={wf.id} className="mb-4 p-4 border rounded">
					<div>
						ID:{" "}
						<Link
							to={"/admin/workflow/$workflowId/forms"}
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
						<pre className="text-sm bg-secondary text-secondary-foreground p-2 mt-2 rounded">
							{JSON.stringify(wf.machineConfig, null, 2)}
						</pre>
					</div>
				</div>
			))}
		</section>
	);
}
