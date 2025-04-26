import { formDataVersionsQueryOptions } from "@/data/formDataVersions";
import { formDefinitionsQueryOptions } from "@/data/formDefinitions";
import { workflowDefinitionsQueryOptions } from "@/data/workflowDefinitions";
import { workflowInstancesQueryOptions } from "@/data/workflowInstances";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: Home,
	loader: async ({ context }) => {
		context.queryClient.ensureQueryData(workflowInstancesQueryOptions());
		context.queryClient.ensureQueryData(workflowDefinitionsQueryOptions());
		context.queryClient.ensureQueryData(formDefinitionsQueryOptions());
		context.queryClient.ensureQueryData(formDataVersionsQueryOptions());
	},
});

function Home() {
	const workflowInstancesQuery = useSuspenseQuery(
		workflowInstancesQueryOptions(),
	);
	const workflowDefinitionsQuery = useSuspenseQuery(
		workflowDefinitionsQueryOptions(),
	);
	const formDefinitionsQuery = useSuspenseQuery(formDefinitionsQueryOptions());
	const formData = useSuspenseQuery(formDataVersionsQueryOptions());
	return (
		<div className="p-8">
			<h1 className="text-2xl font-bold mb-8">Database Status</h1>

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
							<pre className="text-sm bg-gray-50 p-2 mt-2">
								{JSON.stringify(wf.machineConfig, null, 2)}
							</pre>
						</div>
					</div>
				))}
			</section>

			<section className="mb-8">
				<h2 className="text-xl font-semibold mb-4">
					Recent Workflow Instances
				</h2>
				{workflowInstancesQuery.data.map((instance) => (
					<div key={instance.id} className="mb-4 p-4 border rounded">
						<div>
							ID:{" "}
							<Link
								to={"/workflowInstances/$instanceId"}
								params={{ instanceId: instance.id.toString() }}
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

			<section className="mb-8">
				<h2 className="text-xl font-semibold mb-4">Recent Form Definitions</h2>
				{formDefinitionsQuery.data.map((form) => (
					<div key={form.id} className="mb-4 p-4 border rounded">
						<div>ID: {form.id}</div>
						<div>State: {form.state}</div>
						<div>Version: {form.version}</div>
						<div>
							Schema:{" "}
							<pre className="text-sm bg-gray-50 p-2 mt-2">
								{JSON.stringify(form.schema, null, 2)}
							</pre>
						</div>
					</div>
				))}
			</section>

			<section className="mb-8">
				<h2 className="text-xl font-semibold mb-4">
					Recent Form Data Versions
				</h2>
				{formData.data.map((data) => (
					<div key={data.id} className="mb-4 p-4 border rounded">
						<div>ID: {data.id}</div>
						<div>Version: {data.version}</div>
						<div>Created By: {data.createdBy}</div>
						<div>
							Data:{" "}
							<pre className="text-sm bg-gray-50 p-2 mt-2">
								{JSON.stringify(data.data, null, 2)}
							</pre>
						</div>
						<div>
							Patch:{" "}
							<pre className="text-sm bg-gray-50 p-2 mt-2">
								{JSON.stringify(data.patch, null, 2)}
							</pre>
						</div>
					</div>
				))}
			</section>
		</div>
	);
}
