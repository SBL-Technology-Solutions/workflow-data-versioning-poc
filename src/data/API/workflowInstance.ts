import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod/v4";
import { DB } from "@/data/DB";

const workflowInstanceIdSchema = z
	.string()
	.transform((val) => Number.parseInt(val, 10));

const getWorkflowInstanceByIdServerFn = createServerFn({
	method: "GET",
})
	.validator(workflowInstanceIdSchema)
	.handler(async ({ data: workflowInstanceId }) => {
		return DB.workflowInstance.queries.getWorkflowInstanceById(
			workflowInstanceId,
		);
	});

export type WorkflowInstance = Awaited<
	ReturnType<typeof getWorkflowInstanceByIdServerFn>
>;

const getWorkflowInstanceByIdQueryOptions = (instanceId: string) =>
	queryOptions({
		queryKey: ["workflowInstance", instanceId],
		queryFn: () => getWorkflowInstanceByIdServerFn({ data: instanceId }),
	});

const getWorkflowInstancesServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	return DB.workflowInstance.queries.getWorkflowInstances();
});

const getWorkflowInstancesQueryOptions = () =>
	queryOptions({
		queryKey: ["workflowInstances", { limit: 5 }],
		queryFn: () => getWorkflowInstancesServerFn(),
	});

const createWorkflowInstanceServerFn = createServerFn({
	method: "POST",
})
	.validator(
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
	.validator(
		z.object({
			instanceId: z.number(),
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
	mutations: {
		createWorkflowInstanceServerFn,
		sendWorkflowEventServerFn,
	},
};
