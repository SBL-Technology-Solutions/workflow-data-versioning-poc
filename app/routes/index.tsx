import { FormDataVersions } from "@/components/dashboard/FormDataVersions";
import { FormDefinitions } from "@/components/dashboard/FormDefinitions";
import { WorkflowDefinitions } from "@/components/dashboard/WorkflowDefinitions";
import { WorkflowInstances } from "@/components/dashboard/WorkflowInstances";
import { formDataVersionsQueryOptions } from "@/data/formDataVersions";
import { formDefinitionsQueryOptions } from "@/data/formDefinitions";
import { workflowDefinitionsQueryOptions } from "@/data/workflowDefinitions";
import { workflowInstancesQueryOptions } from "@/data/workflowInstances";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/")({
	component: Home,
	loader: async ({ context }) => {
		return {
			workflowInstances: context.queryClient.prefetchQuery(
				workflowInstancesQueryOptions(),
			),
			workflowDefinitions: context.queryClient.prefetchQuery(
				workflowDefinitionsQueryOptions(),
			),
			formDefinitions: context.queryClient.prefetchQuery(
				formDefinitionsQueryOptions(),
			),
			formData: context.queryClient.prefetchQuery(
				formDataVersionsQueryOptions(),
			),
		};
	},
	pendingComponent: () => <div>Loading...</div>,
});

function Home() {
	return (
		<div className="p-8">
			<h1 className="text-2xl font-bold mb-8">Database Status</h1>

			<Suspense fallback={<div>Loading workflow definitions...</div>}>
				<WorkflowDefinitions />
			</Suspense>

			<Suspense fallback={<div>Loading workflow instances...</div>}>
				<WorkflowInstances />
			</Suspense>

			<Suspense fallback={<div>Loading form definitions...</div>}>
				<FormDefinitions />
			</Suspense>

			<Suspense fallback={<div>Loading form data versions...</div>}>
				<FormDataVersions />
			</Suspense>
		</div>
	);
}
