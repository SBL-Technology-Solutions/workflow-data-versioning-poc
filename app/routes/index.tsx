import { FormDataVersions } from "@/components/dashboard/FormDataVersions";
import { FormDefinitions } from "@/components/dashboard/FormDefinitions";
import { WorkflowDefinitions } from "@/components/dashboard/WorkflowDefinitions";
import { WorkflowInstances } from "@/components/dashboard/WorkflowInstances";
import { formDataVersionsQueryOptions } from "@/data/formDataVersions";
import { formDefinitionsQueryOptions } from "@/data/formDefinitions";
import { workflowDefinitionsQueryOptions } from "@/data/workflowDefinitions";
import { createWorkflowInstanceServerFn, workflowInstancesQueryOptions } from "@/data/workflowInstances";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const createWorkflowMutation = useMutation({
		mutationFn: (workflowDefId: number) =>
			createWorkflowInstanceServerFn({ data: { workflowDefId } }),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["workflowInstances"] });
			toast.success("Workflow instance created successfully");
			navigate({ to: "/workflowInstances/$instanceId", params: { instanceId: data.id.toString() } });
		},
		onError: () => {
			toast.error("Failed to create workflow instance");
		},
	});

	const handleCreateWorkflow = () => {
		// For now, we'll use the first workflow definition
		createWorkflowMutation.mutate(1);
	};

	return (
		<div className="p-8">
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-2xl font-bold">Dashboard</h1>
				<Button
					onClick={handleCreateWorkflow}
					disabled={createWorkflowMutation.isPending}
					variant="default"
				>
					{createWorkflowMutation.isPending ? "Creating..." : "Create New Workflow"}
				</Button>
			</div>

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
