import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { formDefinitions } from "@/app/server/db/schema";

export const insertFormDefinitionSchema = createInsertSchema(formDefinitions);

export const selectFormDefinitionSchema = createSelectSchema(formDefinitions);

export type insertFormDefinitionSchemaType = typeof insertFormDefinitionSchema._type;

export type selectFormDefinitionSchemaType = typeof selectFormDefinitionSchema._type;