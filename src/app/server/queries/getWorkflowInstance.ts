"use server";
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
      eq(workflowDefinitions.id, workflowInstances.workflowDefId)
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
