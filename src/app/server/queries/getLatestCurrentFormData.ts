"use server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { formDataVersions } from "../db/schema";

export async function getLatestCurrentFormData(
  workflowInstanceId: number,
  formDefId: number
) {
  const result = await db
    .select({
      id: formDataVersions.id,
      version: formDataVersions.version,
      data: formDataVersions.data,
      patch: formDataVersions.patch,
      createdAt: formDataVersions.createdAt,
      createdBy: formDataVersions.createdBy,
    })
    .from(formDataVersions)
    .where(
      and(
        eq(formDataVersions.workflowInstanceId, workflowInstanceId),
        eq(formDataVersions.formDefId, formDefId)
      )
    )
    .orderBy(desc(formDataVersions.version))
    .limit(1);

  return result;
}
