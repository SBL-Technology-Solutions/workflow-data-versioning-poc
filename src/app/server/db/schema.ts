import { FormSchema } from "@/lib/types/form";
import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod";

type FormSchemaType = z.infer<typeof FormSchema>;

// Workflow Definitions
export const workflowDefinitions = pgTable("workflow_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  version: integer("version").notNull(),
  machineConfig: jsonb("machine_config").notNull(), // XState machine configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Form Schemas
export const formDefinitions = pgTable("form_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowDefId: uuid("workflow_def_id").references(
    () => workflowDefinitions.id
  ),
  state: text("state").notNull(), // corresponds to XState state
  version: integer("version").notNull(),
  schema: jsonb("schema").$type<FormSchemaType>().notNull(), // Zod schema stored as JSON
  createdAt: timestamp("created_at").defaultNow(),
});

// Workflow Instances
export const workflowInstances = pgTable("workflow_instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowDefId: uuid("workflow_def_id").references(
    () => workflowDefinitions.id
  ),
  currentState: text("current_state").notNull(),
  status: text("status").notNull(), // active, completed, suspended
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Form Data Versions
export const formDataVersions = pgTable("form_data_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowInstanceId: uuid("workflow_instance_id").references(
    () => workflowInstances.id
  ),
  formDefId: uuid("form_def_id").references(() => formDefinitions.id),
  version: integer("version").notNull(),
  data: jsonb("data").$type<Record<string, any>>().notNull(),
  patch: jsonb("patch")
    .$type<
      Array<{
        op: string;
        path: string;
        value?: any;
      }>
    >()
    .notNull(), // JSON Patch showing changes from previous version
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: text("created_by").notNull(),
});

export const workflowDefinitionsRelations = relations(
  workflowDefinitions,
  ({ many }) => ({
    instances: many(workflowInstances),
    forms: many(formDefinitions),
  })
);

export const workflowInstancesRelations = relations(
  workflowInstances,
  ({ one }) => ({
    definition: one(workflowDefinitions, {
      fields: [workflowInstances.workflowDefId],
      references: [workflowDefinitions.id],
    }),
  })
);

export const formDefinitionsRelations = relations(
  formDefinitions,
  ({ one, many }) => ({
    workflowDefinition: one(workflowDefinitions, {
      fields: [formDefinitions.workflowDefId],
      references: [workflowDefinitions.id],
    }),
    dataVersions: many(formDataVersions),
  })
);

export const formDataVersionsRelations = relations(
  formDataVersions,
  ({ one }) => ({
    workflowInstance: one(workflowInstances, {
      fields: [formDataVersions.workflowInstanceId],
      references: [workflowInstances.id],
    }),
    formDefinition: one(formDefinitions, {
      fields: [formDataVersions.formDefId],
      references: [formDefinitions.id],
    }),
  })
);
