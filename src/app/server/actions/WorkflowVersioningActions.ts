"use server";

import { and, desc, eq, or } from "drizzle-orm";
import { createJSONPatch } from "../../../lib/utils/jsonPatch";
import { db } from "../db";
import {
  formDataVersions,
  formDefinitions,
  workflowDefinitions,
  workflowInstances,
} from "../db/schema";

export async function createWorkflowVersion(name: string, machineConfig: any) {
  // Get current version number
  const currentVersion = await db
    .select()
    .from(workflowDefinitions)
    .where(eq(workflowDefinitions.name, name))
    .orderBy(desc(workflowDefinitions.version))
    .limit(1);

  const nextVersion = currentVersion.length ? currentVersion[0].version + 1 : 1;

  // Create new workflow version
  return await db.insert(workflowDefinitions).values({
    name,
    version: nextVersion,
    machineConfig,
  });
}

export async function createFormVersion(
  workflowDefId: number,
  state: string,
  schema: any
) {
  const currentVersion = await db
    .select()
    .from(formDefinitions)
    .where(
      and(
        eq(formDefinitions.workflowDefId, workflowDefId),
        eq(formDefinitions.state, state)
      )
    )
    .orderBy(desc(formDefinitions.version))
    .limit(1);

  const nextVersion = currentVersion.length ? currentVersion[0].version + 1 : 1;

  return await db.insert(formDefinitions).values({
    workflowDefId,
    state,
    version: nextVersion,
    schema,
  });
}

export async function createDataVersion(
  workflowInstanceId: number,
  formDefId: number,
  data: any,
  previousVersion?: number
) {
  let patch = data; // First version stores full data as patch

  if (previousVersion) {
    const previousData = await db
      .select()
      .from(formDataVersions)
      .where(
        and(
          eq(formDataVersions.workflowInstanceId, workflowInstanceId),
          eq(formDataVersions.version, previousVersion)
        )
      );

    // Generate JSON Patch
    patch = createJSONPatch(previousData[0].data, data);
  }

  return await db.insert(formDataVersions).values({
    workflowInstanceId,
    formDefId,
    version: previousVersion ? previousVersion + 1 : 1,
    data,
    patch,
    createdBy: "user",
  });
}

export async function compareVersions(
  instanceId: number,
  version1: number,
  version2: number
) {
  const versions = await db
    .select()
    .from(formDataVersions)
    .where(
      and(
        eq(formDataVersions.workflowInstanceId, instanceId),
        or(
          eq(formDataVersions.version, version1),
          eq(formDataVersions.version, version2)
        )
      )
    );

  const v1 = versions.find((v) => v.version === version1);
  const v2 = versions.find((v) => v.version === version2);

  return {
    version1: v1?.data,
    version2: v2?.data,
    diff: createJSONPatch(v1?.data, v2?.data),
  };
}

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

export async function getCurrentForm(
  workflowInstanceId: number,
  state: string
) {
  // Get the workflow instance to find the workflow definition ID
  const result = await db
    .select({
      workflowDefId: workflowInstances.workflowDefId,
      formId: formDefinitions.id,
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

  if (!result[0].formId) {
    throw new Error(`No form found for state: ${state}`);
  }

  return result[0];
}

export async function updateWorkflowState(id: number, newState: string) {
  return await db
    .update(workflowInstances)
    .set({
      currentState: newState,
      updatedAt: new Date(),
    })
    .where(eq(workflowInstances.id, id));
}
