import { db } from "@/app/server/db";
import { workflowDefinitions } from "@/app/server/db/schema";
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
