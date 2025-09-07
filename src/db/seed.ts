import { reset, seed } from "drizzle-seed";
import type { XStateMachineConfig } from "@/types/workflow";
import { dbClient } from "./client";
import * as schema from "./schema";

export const seedData = async () => {
	// 1) Wipe everything (truncates all tables except _drizzle_migrations)
	await reset(dbClient, schema);

	// 2) Define the exact machineConfig(s) you want to seed
	const machineConfig: XStateMachineConfig = {
		initial: "form1",
		states: {
			form1: { on: { NEXT: "form2" } },
			form2: { type: "final" },
		},
	};
	// extract the 'initial' state for use in other tables
	const initialStates = machineConfig.initial;

	const formDefinition1 = {
		title: "Personal Information",
		description: "Please fill out your personal information",
		fields: [
			{
				name: "firstName",
				type: "text",
				label: "First Name",
				required: true,
				minLength: 2,
				maxLength: 50,
			},
			{
				name: "lastName",
				type: "text",
				label: "Last Name",
				required: true,
				minLength: 2,
				maxLength: 50,
			},
			{
				name: "bio",
				type: "textarea",
				label: "Biography",
				description: "Tell us about yourself",
				required: false,
				rows: 4,
				maxLength: 500,
			},
		],
	};

	const formDefinition2 = {
		title: "Contact Information",
		description: "Please provide your contact details",
		fields: [
			{
				name: "email",
				type: "text" as const,
				label: "Email Address",
				required: true,
				pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
			},
			{
				name: "phone",
				type: "text" as const,
				label: "Phone Number",
				required: false,
				pattern: "^\\+?[1-9]\\d{1,14}$",
			},
			{
				name: "address",
				type: "textarea" as const,
				label: "Mailing Address",
				description: "Your complete mailing address",
				required: false,
				rows: 3,
				maxLength: 200,
			},
		],
	};

	// 3) Seed all tables, refining only the columns we care about:
	await seed(dbClient, {
		workflowDefinitions: schema.workflowDefinitions,
		formDefinitions: schema.formDefinitions,
	}).refine((f) => ({
		workflowDefinitions: {
			// only seed as many workflowDefinitions as configs
			count: 1,
			columns: {
				machineConfig: f.default({ defaultValue: machineConfig }),
				version: f.int({ minValue: 1, isUnique: true }),
			},
		},
		formDefinitions: {
			count: 1,
			columns: {
				state: f.default({ defaultValue: initialStates }),
				schema: f.default({ defaultValue: formDefinition1 }),
				version: f.int({ minValue: 1, isUnique: true }),
			},
		},
	}));

	// 4) Insert the second form definition manually with correct schema
	await dbClient.insert(schema.formDefinitions).values({
		state: "form2",
		schema: formDefinition2,
		workflowDefId: 1, // Reference to the workflow definition we just created
		version: 1,
	});
};

async function main() {
	await seedData();

	console.log("✅ Seed complete");
	process.exit(0);
}

main().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
