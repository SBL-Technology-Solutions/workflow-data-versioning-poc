import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { toast } from "sonner";
import { FormDataVersions } from "@/components/dashboard/FormDataVersions";
import { FormDefinitions } from "@/components/dashboard/FormDefinitions";
import { WorkflowDefinitions } from "@/components/dashboard/WorkflowDefinitions";
import { WorkflowInstances } from "@/components/dashboard/WorkflowInstances";
import { Button } from "@/components/ui/button";
import { API } from "@/data/API";
import { formDataVersionsQueryOptions } from "@/data/formDataVersions";
import { formDefinitionsQueryOptions } from "@/data/formDefinitions";
import { workflowDefinitionsQueryOptions } from "@/data/workflowDefinitions";

export const Route = createFileRoute("/")({
	component: Home,
	loader: async ({ context }) => {
		return {
			workflowInstances: context.queryClient.prefetchQuery(
				API.workflowInstance.queries.getWorkflowInstancesQueryOptions(),
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
			API.workflowInstance.mutations.createWorkflowInstanceServerFn({
				data: { workflowDefId },
			}),
		onSuccess: ({ id, currentState }) => {
			queryClient.invalidateQueries({ queryKey: ["workflowInstances"] });
			toast.success("Workflow instance created successfully");
			navigate({
				to: "/workflowInstances/$instanceId",
				params: { instanceId: id.toString() },
				search: { state: currentState },
			});
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
					{createWorkflowMutation.isPending
						? "Creating..."
						: "Create New Workflow"}
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
