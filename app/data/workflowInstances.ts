import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { workflowDefinitions, workflowInstances } from "../db/schema";
export async function getWorkflowInstance(id: number) {
	const { db } = await import("../db");
	const result = await db
		.select({
			id: workflowInstances.id,
			workflowDefId: workflowInstances.workflowDefId,
			currentState: workflowInstances.currentState,
			machineConfig: workflowDefinitions.machineConfig,
		})
		.from(workflowInstances)
		.leftJoin(
			workflowDefinitions,
			eq(workflowDefinitions.id, workflowInstances.workflowDefId),
		)
		.where(eq(workflowInstances.id, id))
		.limit(1);

	if (!result.length) {
		throw new Error("Workflow instance not found");
	}

	if (!result[0].workflowDefId) {
		throw new Error("Workflow definition ID not found");
	}

	if (!result[0].machineConfig) {
		throw new Error("Workflow definition not found");
	}

	return result[0];
}

const workflowInstanceIdSchema = z
	.string()
	.transform((val) => Number.parseInt(val, 10));

export const fetchWorkflowInstance = createServerFn({
	method: "GET",
})
	.validator(workflowInstanceIdSchema)
	.handler(async ({ data: workflowInstanceId }) => {
		return getWorkflowInstance(workflowInstanceId);
	});

export type WorkflowInstance = Awaited<
	ReturnType<typeof fetchWorkflowInstance>
>;

export const fetchWorkflowInstanceQueryOptions = (instanceId: string) =>
	queryOptions({
		queryKey: ["workflowInstance", instanceId],
		queryFn: () => fetchWorkflowInstance({ data: instanceId }),
	});

export async function listWorkflowInstances() {
	const { db } = await import("../db");
	return await db
		.select()
		.from(workflowInstances)
		.orderBy(desc(workflowInstances.createdAt))
		.limit(5);
}

export const fetchWorkflowInstances = createServerFn({
	method: "GET",
}).handler(async () => {
	console.info("Fetching workflow Instances");
	return listWorkflowInstances();
});

export const workflowInstancesQueryOptions = () =>
	queryOptions({
		queryKey: ["workflowInstances", { limit: 5 }],
		queryFn: () => fetchWorkflowInstances(),
	});

export async function updateWorkflowState(id: number, newState: string) {
	const { db } = await import("../db");
	const result = await db
		.update(workflowInstances)
		.set({
			currentState: newState,
			updatedAt: new Date(),
		})
		.where(eq(workflowInstances.id, id))
		.returning({ id: workflowInstances.id });

	return result;
}

export const updateWorkflowStateServerFn = createServerFn({
	method: "POST",
})
	.validator(
		z.object({
			id: z.number(),
			newState: z.string(),
		}),
	)
	.handler(async ({ data: { id, newState } }) => {
		return updateWorkflowState(id, newState);
	});
