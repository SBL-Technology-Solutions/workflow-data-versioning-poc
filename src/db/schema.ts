import { relations, sql } from "drizzle-orm";
import {
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import type * as z from "zod/v4";
import type { FormSchema } from "@/lib/form";

type FormSchemaType = z.infer<typeof FormSchema>;

// Workflow Definitions
export const workflowDefinitions = pgTable("workflow_definitions", {
	id: serial("id").primaryKey(),
	name: varchar("name").notNull(),
	version: integer("version").notNull(),
	machineConfig: jsonb("machine_config").$type<Record<string, any>>().notNull(),
	states: text("states")
		.array()
		.generatedAlwaysAs(() => sql`states_keys(machine_config->'states')`),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at")
		.notNull()
		.$onUpdateFn(() => new Date()),
});

// Form Schemas
export const formDefinitions = pgTable("form_definitions", {
	id: serial("id").primaryKey(),
	workflowDefId: integer("workflow_def_id")
		.references(() => workflowDefinitions.id)
		.notNull(),
	state: varchar("state").notNull(), // corresponds to XState state
	version: integer("version").notNull(),
	schema: jsonb("schema").$type<FormSchemaType>().notNull(), // Zod schema stored as JSON
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at")
		.notNull()
		.defaultNow()
		.$onUpdateFn(() => new Date()),
});

// Workflow Instances
export const workflowInstances = pgTable("workflow_instances", {
	id: serial("id").primaryKey(),
	workflowDefId: integer("workflow_def_id")
		.references(() => workflowDefinitions.id)
		.notNull(),
	currentState: varchar("current_state").notNull(),
	status: varchar("status").notNull(), // active, completed, suspended
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at")
		.notNull()
		.defaultNow()
		.$onUpdateFn(() => new Date()),
});

// Form Data Versions
export const formDataVersions = pgTable("form_data_versions", {
	id: serial("id").primaryKey(),
	workflowInstanceId: integer("workflow_instance_id")
		.references(() => workflowInstances.id)
		.notNull(),
	formDefId: integer("form_def_id")
		.references(() => formDefinitions.id)
		.notNull(),
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
	createdAt: timestamp("created_at").notNull().defaultNow(),
	createdBy: varchar("created_by").notNull(),
});

export const workflowDefinitionsRelations = relations(
	workflowDefinitions,
	({ many }) => ({
		instances: many(workflowInstances),
		forms: many(formDefinitions),
	}),
);

export const workflowInstancesRelations = relations(
	workflowInstances,
	({ one }) => ({
		definition: one(workflowDefinitions, {
			fields: [workflowInstances.workflowDefId],
			references: [workflowDefinitions.id],
		}),
	}),
);

export const formDefinitionsRelations = relations(
	formDefinitions,
	({ one, many }) => ({
		workflowDefinition: one(workflowDefinitions, {
			fields: [formDefinitions.workflowDefId],
			references: [workflowDefinitions.id],
		}),
		dataVersions: many(formDataVersions),
	}),
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
	}),
);
