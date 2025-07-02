import type { FormSchema } from "@/types/form";
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
import type { z } from "zod";

type FormSchemaType = z.infer<typeof FormSchema>;

// Workflow Definitions
export const workflowDefinitions = pgTable("workflow_definitions", {
	id: serial("id").primaryKey(),
	name: varchar("name").notNull(),
	version: integer("version").notNull(),
	machineConfig: jsonb("machine_config").$type<{
		id: string;
		initial: string;
		states: Record<
			string,
			{
				on?: Record<string, string>;
			}
		>;
	}>(),
	states: text("states")
		.array()
		.generatedAlwaysAs(() => sql`states_keys(machine_config->'states')`),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at")
		.notNull()
		.defaultNow()
		.$onUpdateFn(() => new Date()),
});

// Form Definitions (now independent entities)
export const formDefinitions = pgTable("form_definitions", {
	id: serial("id").primaryKey(),
	version: integer("version").notNull(),
	schema: jsonb("schema").$type<FormSchemaType>().notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at")
		.notNull()
		.defaultNow()
		.$onUpdateFn(() => new Date()),
});

// Junction table: maps workflow states to form definitions
export const workflowFormDefinitions = pgTable("workflow_form_definitions", {
	id: serial("id").primaryKey(),
	workflowDefId: serial("workflow_def_id").references(
		() => workflowDefinitions.id,
	),
	formDefId: serial("form_def_id").references(() => formDefinitions.id),
	state: varchar("state").notNull(), // which state in the workflow this form is for
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at")
		.notNull()
		.defaultNow()
		.$onUpdateFn(() => new Date()),
});

// Workflow Instances
export const workflowInstances = pgTable("workflow_instances", {
	id: serial("id").primaryKey(),
	workflowDefId: serial("workflow_def_id").references(
		() => workflowDefinitions.id,
	),
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
	workflowInstanceId: serial("workflow_instance_id").references(
		() => workflowInstances.id,
	),
	formDefId: serial("form_def_id").references(() => formDefinitions.id),
	version: integer("version").notNull(),
	data: jsonb("data").$type<Record<string, unknown>>().notNull(),
	patch: jsonb("patch")
		.$type<
			Array<{
				op: string;
				path: string;
				value?: unknown;
			}>
		>()
		.notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	createdBy: varchar("created_by").notNull(),
});

// Relations
export const workflowDefinitionsRelations = relations(
	workflowDefinitions,
	({ many }) => ({
		instances: many(workflowInstances),
		formDefinitions: many(workflowFormDefinitions),
	}),
);

export const formDefinitionsRelations = relations(
	formDefinitions,
	({ many }) => ({
		workflowDefinitions: many(workflowFormDefinitions),
		dataVersions: many(formDataVersions),
	}),
);

export const workflowFormDefinitionsRelations = relations(
	workflowFormDefinitions,
	({ one }) => ({
		workflowDefinition: one(workflowDefinitions, {
			fields: [workflowFormDefinitions.workflowDefId],
			references: [workflowDefinitions.id],
		}),
		formDefinition: one(formDefinitions, {
			fields: [workflowFormDefinitions.formDefId],
			references: [formDefinitions.id],
		}),
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
