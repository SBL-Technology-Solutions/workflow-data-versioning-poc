import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { API } from "@/data/API";

export function WorkflowDefinitions() {
	const workflowDefinitionsQuery = useSuspenseQuery(
		API.workflowDefinition.queries.getWorkflowDefinitionsQueryOptions(),
	);

	return (
		<section className="mb-8">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-xl font-semibold">Recent Workflow Definitions</h2>
				<Link
					to="/admin/workflow/new"
					className="text-blue-500 hover:underline"
				>
					New Workflow
				</Link>
			</div>
			{workflowDefinitionsQuery.data.map((wf) => (
				<div key={wf.id} className="mb-4 rounded border p-4">
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
						<pre className="mt-2 rounded bg-secondary p-2 text-sm text-secondary-foreground">
							{JSON.stringify(wf.machineConfig, null, 2)}
						</pre>
					</div>
				</div>
			))}
		</section>
	);
}
