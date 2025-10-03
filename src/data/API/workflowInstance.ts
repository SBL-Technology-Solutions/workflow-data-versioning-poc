import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { DB } from "@/data/DB";

const workflowInstanceQueryKeys = {
	all: () => ["workflowInstances"] as const,
	lists: () => [...workflowInstanceQueryKeys.all(), "list"] as const,
	list: () => [...workflowInstanceQueryKeys.lists()] as const,
	details: () => [...workflowInstanceQueryKeys.all(), "detail"] as const,
	detail: (id: number) => [...workflowInstanceQueryKeys.details(), id] as const,
} as const;

const WorkflowInstanceIdSchema =
	DB.workflowInstance.queries.workflowInstancesSelectSchema.pick({ id: true })
		.shape.id;

const getWorkflowInstanceByIdServerFn = createServerFn({
	method: "GET",
})
	.inputValidator(WorkflowInstanceIdSchema)
	.handler(async ({ data: workflowInstanceId }) => {
		return DB.workflowInstance.queries.getWorkflowInstanceById(
			workflowInstanceId,
		);
	});

export type WorkflowInstance = Awaited<
	ReturnType<typeof getWorkflowInstanceByIdServerFn>
>;

const getWorkflowInstanceByIdQueryOptions = (instanceId: number) =>
	queryOptions({
		queryKey: workflowInstanceQueryKeys.detail(instanceId),
		queryFn: () => getWorkflowInstanceByIdServerFn({ data: instanceId }),
	});

export const getWorkflowInstancesServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	return DB.workflowInstance.queries.getWorkflowInstances();
});

const getWorkflowInstancesQueryOptions = () =>
	queryOptions({
		queryKey: workflowInstanceQueryKeys.list(),
		queryFn: () => getWorkflowInstancesServerFn(),
	});

const createWorkflowInstanceServerFn = createServerFn({
	method: "POST",
})
	.inputValidator(
		z.object({
			workflowDefId: z.number(),
		}),
	)
	.handler(async ({ data: { workflowDefId } }) => {
		return DB.workflowInstance.mutations.createWorkflowInstance(workflowDefId);
	});

const sendWorkflowEventServerFn = createServerFn({
	method: "POST",
})
	.inputValidator(
		z.object({
			instanceId: WorkflowInstanceIdSchema,
			event: z.string(),
			formDefId: z.number(),
			formData: z.record(z.string(), z.string()),
		}),
	)
	.handler(async ({ data: { instanceId, event, formData, formDefId } }) => {
		return DB.workflowInstance.mutations.sendWorkflowEvent(
			instanceId,
			formDefId,
			event,
			formData,
		);
	});

export const workflowInstance = {
	queries: {
		getWorkflowInstancesQueryOptions,
		getWorkflowInstanceByIdQueryOptions,
	},
	queryKeys: workflowInstanceQueryKeys,
	mutations: {
		createWorkflowInstanceServerFn,
		sendWorkflowEventServerFn,
	},
} as const;
