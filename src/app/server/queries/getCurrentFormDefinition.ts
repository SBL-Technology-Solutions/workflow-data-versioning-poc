import { db } from "@/app/server/db";
import { formDefinitions } from "@/app/server/db/schema";
import { and, desc, eq } from "drizzle-orm";

export async function getCurrentFormDefinition(workflowId: number, state: string) {
  const forms = await db
    .select()
    .from(formDefinitions)
    .where(
      and(
        eq(formDefinitions.workflowDefId, workflowId),
        eq(formDefinitions.state, state)
      )
    )
    .orderBy(desc(formDefinitions.version))
    .limit(1);

  return forms[0];
} 