"use server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { formDefinitions, workflowInstances } from "../../db/schema";

export async function getCurrentForm(
  workflowInstanceId: number,
  state: string
) {
  // Using the workflowInstanceId, get the latest Form Definition
  // for the current state of the workflow instance
  const result = await db
    .select({
      workflowDefId: workflowInstances.workflowDefId,
      formDefId: formDefinitions.id,
      schema: formDefinitions.schema,
    })
    .from(workflowInstances)
    .leftJoin(
      formDefinitions,
      and(
        eq(formDefinitions.workflowDefId, workflowInstances.workflowDefId),
        eq(formDefinitions.state, state)
      )
    )
    .where(eq(workflowInstances.id, workflowInstanceId))
    .orderBy(desc(formDefinitions.version))
    .limit(1);

  if (!result.length) {
    throw new Error("Workflow instance not found");
  }

  if (!result[0].workflowDefId) {
    throw new Error("Workflow definition ID not found");
  }

  if (!result[0].formDefId) {
    throw new Error(`No form found for state: ${state}`);
  }

  return result[0];
}
