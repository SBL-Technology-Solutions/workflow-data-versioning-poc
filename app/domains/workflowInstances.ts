import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { workflowDefinitions, workflowInstances } from "../db/schema";

export async function getWorkflowInstance(id: number) {
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

export async function listWorkflowInstances() {
	return await db.select().from(workflowInstances);
}

export const fetchWorkflowInstances = createServerFn({
	method: "GET",
}).handler(async () => {
	console.info("Fetching workflow Instances");
	return listWorkflowInstances();
});

export const workflowInstancesQueryOptions = () => ({
	queryKey: ["workflowInstances"],
	queryFn: () => fetchWorkflowInstances(),
});
