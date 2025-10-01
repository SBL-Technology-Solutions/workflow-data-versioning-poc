import { useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { useEffect } from "react";
import * as z from "zod";
import { DynamicForm } from "@/components/DynamicForm";
import { StateSelector } from "@/components/StateSelector";
import { API } from "@/data/API";
import { clientLoggerFn } from "@/lib/logger";

const workflowInstanceSearchSchema = z.object({
	state: z.string().catch(""),
});

export const Route = createFileRoute("/workflowInstances/$instanceId")({
	component: RouteComponent,
	validateSearch: workflowInstanceSearchSchema,
	loaderDeps: ({ search: { state } }) => ({ state }),
	loader: async ({ params, context, deps: { state } }) =>
		context.queryClient.ensureQueryData(
			API.formDataVersion.queries.getCurrentFormDataForWorkflowInstanceQueryOptions(
				Number(params.instanceId),
				state,
			),
		),
});

function RouteComponent() {
	const { instanceId } = Route.useParams();
	const { state } = useSearch({ from: "/workflowInstances/$instanceId" });
	const navigate = useNavigate();

	const { data: currentFormData } = useSuspenseQuery(
		API.formDataVersion.queries.getCurrentFormDataForWorkflowInstanceQueryOptions(
			Number(instanceId),
			state,
		),
	);

	const handleStateChange = (newState: string) => {
		navigate({
			to: "/workflowInstances/$instanceId",
			params: { instanceId },
			search: { state: newState },
		});
	};

	if (!currentFormData.formDefinitionSchema) {
		clientLoggerFn({
			data: {
				level: "error",
				message: "Missing form definition schema for workflow instance",
				meta: {
					instanceId: currentFormData.workflowInstanceId,
					state: currentFormData.workflowInstanceState,
				},
			},
		});
		throw new Error("No schema found for this state");
	}

	if (!currentFormData.workflowDefinitionMachineConfig) {
		clientLoggerFn({
			data: {
				level: "error",
				message: "Missing workflow machine config",
				meta: {
					instanceId: currentFormData.workflowInstanceId,
					state: currentFormData.workflowInstanceState,
				},
			},
		});
		throw new Error("No machine configuration found");
	}

	if (!currentFormData.formDefinitionId) {
		clientLoggerFn({
			data: {
				level: "error",
				message: "Missing form definition identifier",
				meta: {
					instanceId: currentFormData.workflowInstanceId,
					state: currentFormData.workflowInstanceState,
				},
			},
		});
		throw new Error("No form definition found for this state");
	}
	if (!currentFormData.workflowDefinitionStates) {
		void clientLoggerFn({
			data: {
				level: "error",
				message: "Missing workflow definition states",
				meta: {
					instanceId: currentFormData.workflowInstanceId,
					state: currentFormData.workflowInstanceState,
				},
			},
		});
		throw new Error("No workflow definition states found for this workflow");
	}

	// Only allow selection of states up to the current state
	const availableStates = currentFormData.workflowDefinitionStates.slice(
		0,
		currentFormData.workflowDefinitionStates.indexOf(
			currentFormData.workflowInstanceCurrentState || "",
		) + 1,
	);

	return (
		<div className="container mx-auto p-4">
			<div className="flex justify-between items-center mb-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-bold">
						Workflow Step: {currentFormData.workflowInstanceState}
					</h1>
					<StateSelector
						states={availableStates}
						currentState={currentFormData.workflowInstanceState}
						onStateChange={handleStateChange}
					/>
				</div>
			</div>

			<DynamicForm
				schema={currentFormData.formDefinitionSchema}
				initialData={currentFormData.data || undefined}
				workflowInstanceId={currentFormData.workflowInstanceId}
				state={currentFormData.workflowInstanceState}
				formDefId={currentFormData.formDefinitionId}
				machineConfig={currentFormData.workflowDefinitionMachineConfig}
			/>
		</div>
	);
}
