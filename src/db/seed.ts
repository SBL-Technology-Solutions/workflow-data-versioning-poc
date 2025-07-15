import { reset, seed } from "drizzle-seed";
import { getDbClient } from "./client";
import * as schema from "./schema";

export const seedData = async () => {
	const dbClient = getDbClient();
	// 1) Wipe everything (truncates all tables except _drizzle_migrations)
	await reset(dbClient, schema);

	// 2) Define the exact machineConfig(s) you want to seed
	const machineConfig = {
		initial: "form1",
		states: {
			form1: { on: { NEXT: "form2" } },
			form2: { type: "final" },
		},
	};
	// extract the 'initial' state for use in other tables
	const initialStates = machineConfig.initial;

	const formDefinition = {
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
			},
		},
		formDefinitions: {
			// one formDefinition per workflowDefinition
			count: 1,
			columns: {
				state: f.default({ defaultValue: initialStates }),
				schema: f.default({ defaultValue: formDefinition }),
			},
		},
	}));
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
