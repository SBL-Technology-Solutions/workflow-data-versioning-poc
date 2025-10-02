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
import { clientLoggerFn } from "@/lib/logger";
import workflowDefinitionCollection from "@/data/collections/workflowDefinition";
import workflowInstanceCollection from "@/data/collections/workflowInstance";
import formDefinitionCollection from "@/data/collections/formDefinition";
import formDataVersionCollection from "@/data/collections/formDataVersion";

export const Route = createFileRoute("/")({
	component: Home,
	loader: async () => {
		await workflowDefinitionCollection.preload()
		await workflowInstanceCollection.preload()
		await formDefinitionCollection.preload()
		await formDataVersionCollection.preload()
		return null	
  	},
});

function Home() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const createWorkflowMutation = useMutation({
		mutationFn: (workflowDefId: number) =>
			API.workflowInstance.mutations.createWorkflowInstanceServerFn({
				data: { workflowDefId },
			}),
		onMutate: (workflowDefId) => {
			clientLoggerFn({
				data: {
					level: "info",
					message: "Creating workflow instance",
					meta: {
						workflowDefId,
					},
				},
			});
		},
		onSuccess: ({ id, currentState }) => {
			clientLoggerFn({
				data: {
					level: "info",
					message: "Workflow instance created",
					meta: {
						instanceId: id,
						state: currentState,
					},
				},
			});
			queryClient.invalidateQueries({ queryKey: ["workflowInstances"] });
			toast.success("Workflow instance created successfully");
			navigate({
				to: "/workflowInstances/$instanceId",
				params: { instanceId: id.toString() },
				search: { state: currentState },
			});
		},
		onError: (error, workflowDefId) => {
			const message = error instanceof Error ? error.message : String(error);
			toast.error("Failed to create workflow instance", {
				description: message,
			});
			clientLoggerFn({
				data: {
					level: "error",
					message: "Failed to create workflow instance",
					meta: {
						workflowDefId,
						error: message,
					},
				},
			});
		},
	});

	const handleCreateWorkflow = () => {
		// For now, we'll use the first workflow definition
		createWorkflowMutation.mutate(1);
	};

	return (
		<div className="p-8 relative">
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
