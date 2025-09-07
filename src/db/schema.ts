import { relations, sql } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";
import type { FormSchema, FormValues } from "@/lib/form";
import type { JSONPatch } from "@/lib/jsonPatch";
import type { XStateMachineConfig } from "@/types/workflow";

const { createInsertSchema, createSelectSchema, createUpdateSchema } =
	createSchemaFactory({ zodInstance: z });

// Reusable fields

const createdAt = timestamp().notNull().defaultNow();
const updatedAt = timestamp()
	.notNull()
	.defaultNow()
	.$onUpdateFn(() => new Date());
const timestamps = {
	createdAt,
	updatedAt,
};

const createdBy = varchar().notNull();
const updatedBy = varchar().notNull();
const userEditFields = {
	createdBy,
	updatedBy,
};

const timestampsAndUserEditFields = {
	...timestamps,
	...userEditFields,
};

// Tables

export const workflowDefinitions = pgTable(
	"workflow_definitions",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		name: varchar().notNull(),
		version: integer().notNull(),
		machineConfig: jsonb().$type<XStateMachineConfig>().notNull(),
		states: text()
			.array()
			.generatedAlwaysAs(() => sql`states_keys(machine_config->'states')`),
		isCurrent: boolean().notNull().default(false),
		createdAt,
		createdBy,
	},
	(table) => [
		uniqueIndex("workflow_definition_name_version_idx").on(
			table.name,
			table.version,
		),
		uniqueIndex("workflow_definition_is_current_idx")
			.on(table.name)
			.where(sql`${table.isCurrent} = true`),
		index("workflow_definition_machine_config_idx").using(
			"gin",
			table.machineConfig,
		),
	],
);

export const formDefinitions = pgTable(
	"form_definitions",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		state: varchar().notNull(), // corresponds to XState state
		version: integer().notNull(),
		schema: jsonb().$type<FormSchema>().notNull(), // Zod schema stored as JSON
		isCurrent: boolean().notNull().default(false),
		createdAt,
		createdBy,
	},
	(table) => [
		uniqueIndex("form_definition_state_version_idx").on(
			table.state,
			table.version,
		),
		uniqueIndex("form_definition_is_current_idx")
			.on(table.state)
			.where(sql`${table.isCurrent} = true`),
		index("form_definition_schema_idx").using("gin", table.schema),
	],
);

export const workflowDefinitionsFormDefinitionsMap = pgTable(
	"workflow_definitions_form_definitions_map",
	{
		workflowDefinitionId: integer().notNull(),
		formDefinitionId: integer().notNull(),
		...timestampsAndUserEditFields,
	},
	(table) => [
		primaryKey({
			name: "wdfdm_pk",
			columns: [table.workflowDefinitionId, table.formDefinitionId],
		}),
		foreignKey({
			columns: [table.workflowDefinitionId],
			foreignColumns: [workflowDefinitions.id],
			name: "wdfdm_workflow_definition_id_fk",
		}),
		foreignKey({
			columns: [table.formDefinitionId],
			foreignColumns: [formDefinitions.id],
			name: "wdfdm_form_definition_id_fk",
		}),
	],
);

export const workflowInstances = pgTable("workflow_instances", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	workflowDefId: integer()
		.references(() => workflowDefinitions.id)
		.notNull(),
	//TODO: Should we add a calculated column to get the workflow type from the workflow definition id?
	currentState: varchar().notNull(),
	...timestampsAndUserEditFields,
});

export const formDataVersions = pgTable("form_data_versions", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	workflowInstanceId: integer()
		.references(() => workflowInstances.id)
		.notNull(),
	formDefId: integer()
		.references(() => formDefinitions.id)
		.notNull(),
	version: integer().notNull(),
	data: jsonb().$type<FormValues<FormSchema>>().notNull(),
	patch: jsonb().$type<JSONPatch>().notNull(),
	createdAt,
	createdBy,
});

// Zod schemas

export const workflowDefinitionsInsertSchema = createInsertSchema(
	workflowDefinitions,
).omit({
	id: true,
	createdAt: true,
});

export const workflowDefinitionsSelectSchema =
	createSelectSchema(workflowDefinitions);

export const workflowDefinitionsUpdateSchema = createUpdateSchema(
	workflowDefinitions,
).omit({
	createdAt: true,
});

export const formDefinitionsInsertSchema = createInsertSchema(
	formDefinitions,
).omit({
	id: true,
	createdAt: true,
});

export const formDefinitionsSelectSchema = createSelectSchema(formDefinitions);

export const formDefinitionsUpdateSchema = createUpdateSchema(
	formDefinitions,
).omit({
	createdAt: true,
});

export const workflowDefinitionsFormDefinitionsMapInsertSchema =
	createInsertSchema(workflowDefinitionsFormDefinitionsMap).omit({
		createdAt: true,
		updatedAt: true,
	});

export const workflowDefinitionsFormDefinitionsMapUpdateSchema =
	createUpdateSchema(workflowDefinitionsFormDefinitionsMap).omit({
		createdAt: true,
		updatedAt: true,
		createdBy: true,
	});

export const workflowDefinitionsFormDefinitionsMapSelectSchema =
	createSelectSchema(workflowDefinitionsFormDefinitionsMap);

export const workflowInstancesInsertSchema = createInsertSchema(
	workflowInstances,
).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export const workflowInstancesUpdateSchema = createUpdateSchema(
	workflowInstances,
).omit({
	createdAt: true,
	updatedAt: true,
});

export const workflowInstancesSelectSchema = createSelectSchema(
	workflowInstances,
	{
		id: (schema) =>
			schema.refine((val) => val > 0, {
				message: "Workflow Instance ID must be greater than 0",
			}),
	},
);

export const formDataVersionsInsertSchema = createInsertSchema(
	formDataVersions,
).omit({
	id: true,
	createdAt: true,
});

export const formDataVersionsUpdateSchema = createUpdateSchema(
	formDataVersions,
).omit({
	createdAt: true,
});

export const formDataVersionsSelectSchema =
	createSelectSchema(formDataVersions);

// Relations

export const workflowDefinitionsRelations = relations(
	workflowDefinitions,
	({ many }) => ({
		instances: many(workflowInstances),
		workflowDefinitionsFormDefinitionsMap: many(
			workflowDefinitionsFormDefinitionsMap,
		),
	}),
);

export const formDefinitionsRelations = relations(
	formDefinitions,
	({ many }) => ({
		workflowDefinitionsFormDefinitionsMap: many(
			workflowDefinitionsFormDefinitionsMap,
		),
		dataVersions: many(formDataVersions),
	}),
);

export const workflowDefinitionsFormDefinitionsMapRelations = relations(
	workflowDefinitionsFormDefinitionsMap,
	({ one }) => ({
		workflowDefinition: one(workflowDefinitions, {
			fields: [workflowDefinitionsFormDefinitionsMap.workflowDefinitionId],
			references: [workflowDefinitions.id],
			relationName: "workflowDefinition",
		}),
		formDefinition: one(formDefinitions, {
			fields: [workflowDefinitionsFormDefinitionsMap.formDefinitionId],
			references: [formDefinitions.id],
			relationName: "formDefinition",
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
