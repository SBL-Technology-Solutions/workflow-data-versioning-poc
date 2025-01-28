"use server";

import { eq } from "drizzle-orm";
import { flattenValidationErrors } from "next-safe-action";
import { redirect } from "next/navigation";

import { db } from "@/app/server/db";
import { formDefinitions } from "@/app/server/db/schema";
import { actionClient } from "@/lib/safe-action";
import { insertFormDefinitionSchema, type insertFormDefinitionSchemaType } from "../zod-schemas/formDefinitions";

export const createFormVersionAction = actionClient
    .metadata({actionName: 'createFormVersionAction'})
    .schema(insertFormDefinitionSchema, {
        handleValidationErrorsShape: async (ve) => flattenValidationErrors(ve).fieldErrors,
    })
    .action(async ({ parsedInput: formDefinition }: { parsedInput: insertFormDefinitionSchemaType }) => {
        const result = await db.insert(formDefinitions).values({
            state: formDefinition.state,
            workflowDefId: formDefinition.workflowDefId,
            version: formDefinition.version? formDefinition.version + 1 : 1,
            schema: formDefinition.schema as any,
        }).returning({ insertedId: formDefinitions.id });

    return { message: `Form version ${result[0].insertedId} created successfully` };
    });