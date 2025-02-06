import { db } from "@/db";
import { workflowDefinitions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getWorkflowDefinition(id: number) {
  const workflows = await db
    .select()
    .from(workflowDefinitions)
    .where(eq(workflowDefinitions.id, id))
    .limit(1);

  if (!workflows.length) {
    throw new Error("Workflow not found");
  }

  return workflows[0];
}
