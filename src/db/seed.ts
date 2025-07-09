import { dbClient } from "@/db";
import {
	formDefinitions,
	workflowDefinitions,
	workflowInstances,
} from "@/db/schema";
import { FormSchema } from "@/lib/form";

/**
 * Populates the database with initial workflow, form, and workflow instance data for development or testing purposes.
 *
 * Inserts a sample workflow definition with a state machine, a corresponding form definition with validated schema, and a workflow instance linked to the created workflow. Exits the process upon completion.
 */
async function seed() {
	try {
		// Create a workflow definition
		const [workflow] = await dbClient
			.insert(workflowDefinitions)
			.values({
				name: "Sample Workflow",
				version: 1,
				machineConfig: {
					initial: "form1",
					states: {
						form1: {
							on: { NEXT: "form2" },
						},
						form2: {
							type: "final",
						},
					},
				},
			})
			.returning();

		// Create a form definition
		const formSchema = FormSchema.parse({
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
		});

		await dbClient.insert(formDefinitions).values({
			workflowDefId: workflow.id,
			state: "form1",
			version: 1,
			schema: formSchema,
		});

		// Create a sample workflow instance
		await dbClient.insert(workflowInstances).values({
			workflowDefId: workflow.id,
			currentState: "form1",
			status: "active",
		});

		console.log("Seed data inserted successfully!");
	} catch (error) {
		console.error("Error seeding database:", error);
	} finally {
		process.exit(0);
	}
}

seed().catch(console.error);
