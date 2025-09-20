import { reset } from "drizzle-seed";
import type { FormSchema } from "@/lib/form";
import type { SerializableWorkflowMachineConfig } from "@/types/workflow";
import { dbClient } from "./client";
import * as schema from "./schema";

export const approvalWorkflowDefinitionMachineConfig: SerializableWorkflowMachineConfig = {
	initial: "draft",
	states: {
		draft: { on: { Submit: "approved" } },
		approved: { type: "final" },
	},
};

export const approvalWorkflowDefinition: schema.WorkflowDefinitionsInsert = {
	name: "Approval Workflow",
	version: 1,
	machineConfig: approvalWorkflowDefinitionMachineConfig,
	createdBy: "system",
	isCurrent: true,
};

export const draftFormSchema: FormSchema = {
	title: "Draft",
	description: "Draft New Activity Approval Proposal",
	fields: [
		{
			name: "proposalTitle",
			type: "text",
			label: "Proposal Title",
			required: true,
			minLength: 5,
			maxLength: 150,
		},
		{
			name: "proposalDescription",
			type: "textarea",
			label: "Proposal Description",
			required: true,
			minLength: 5,
			maxLength: 500,
			rows: 4,
		},
		{
			name: "businessLine",
			type: "text",
			label: "Business Line",
			description: "The business line of the proposal",
			required: false,
			minLength: 5,
			maxLength: 150,
		},
	],
};

const approvedFormSchema: FormSchema = {
	title: "Approved",
	description: "Approved New Activity Approval Proposal",
	fields: [
		{
			name: "approvalDecision",
			type: "text" as const,
			label: "Approval Decision",
			required: true,
		},
		{
			name: "approvalDecisionRationale",
			type: "textarea" as const,
			label: "Approval Decision Rationale",
			required: true,
			rows: 4,
		},
		{
			name: "approvalBy",
			type: "text" as const,
			label: "Approval By",
			required: true,
		},
		{
			name: "approvalDate",
			type: "text" as const,
			label: "Approval Date",
			description: "The date of the approval",
			required: true,
		},
	],
};

const draftFormDefinition: schema.FormDefinitionsInsert = {
	state: "draft",
	schema: draftFormSchema,
	version: 1,
	createdBy: "system",
};

const approvedFormDefinition: schema.FormDefinitionsInsert = {
	state: "approved",
	schema: approvedFormSchema,
	version: 1,
	createdBy: "system",
};

export const resetAndSeedApprovalDataDefinitions = async () => {
	// 1) Wipe everything (truncates all tables except _drizzle_migrations)
	await reset(dbClient, schema);

	const [{ id: workflowDefId }] = await dbClient
		.insert(schema.workflowDefinitions)
		.values(approvalWorkflowDefinition)
		.returning();
	const [{ id: draftFormDefId }] = await dbClient
		.insert(schema.formDefinitions)
		.values(draftFormDefinition)
		.returning();
	const [{ id: approvedFormDefId }] = await dbClient
		.insert(schema.formDefinitions)
		.values(approvedFormDefinition)
		.returning();
	await dbClient.insert(schema.workflowDefinitionsFormDefinitionsMap).values({
		workflowDefinitionId: workflowDefId,
		formDefinitionId: draftFormDefId,
		createdBy: "system",
		updatedBy: "system",
	});
	await dbClient.insert(schema.workflowDefinitionsFormDefinitionsMap).values({
		workflowDefinitionId: workflowDefId,
		formDefinitionId: approvedFormDefId,
		createdBy: "system",
		updatedBy: "system",
	});
};

async function main() {
	await resetAndSeedApprovalDataDefinitions();

	console.log("✅ Seed complete");
	process.exit(0);
}

main().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
