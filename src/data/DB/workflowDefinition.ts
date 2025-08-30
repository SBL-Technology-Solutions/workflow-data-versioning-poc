import { desc, eq } from "drizzle-orm";
import { dbClient } from "@/db/client";
import { formDefinitions, workflowDefinitions } from "@/db/schema";
import type { FormSchema } from "@/lib/form";
import { getWorkflowStates } from "@/lib/workflow";

/**
 * Retrieves up to five workflow definitions from the database, ordered by creation date in descending order.
 *
 * @returns An array of workflow definition records.
 */
const getWorkflowDefinitions = async () => {
	return await dbClient
		.select()
		.from(workflowDefinitions)
		.orderBy(desc(workflowDefinitions.createdAt));
};

/**
 * Retrieves a workflow definition by its unique ID.
 *
 * @param id - The unique identifier of the workflow definition to retrieve
 * @returns The workflow definition matching the given ID
 * @throws Error if no workflow definition with the specified ID is found
 */
const getWorkflowDefinition = async (id: number) => {
	const workflows = await dbClient
		.select()
		.from(workflowDefinitions)
		.where(eq(workflowDefinitions.id, id))
		.limit(1);

	if (!workflows.length) {
		throw new Error("Workflow not found");
	}

	return workflows[0];
};

const createWorkflowDefinition = async (
	name: string,
	machineConfig: Record<string, any>,
	forms?: Record<string, { formDefId?: number; schema?: FormSchema }>,
) => {
	const currentVersion = await dbClient
		.select({ version: workflowDefinitions.version })
		.from(workflowDefinitions)
		.where(eq(workflowDefinitions.name, name))
		.orderBy(desc(workflowDefinitions.version))
		.limit(1);

	const nextVersion = currentVersion.length ? currentVersion[0].version + 1 : 1;

	const [newWorkflow] = await dbClient
		.insert(workflowDefinitions)
		.values({ name, version: nextVersion, machineConfig })
		.returning();

	const requiredStates = getWorkflowStates(machineConfig);

	for (const state of requiredStates) {
		const formInfo = forms?.[state];
		let schema: FormSchema | undefined;

		if (formInfo?.formDefId) {
			const existing = await dbClient
				.select({ schema: formDefinitions.schema })
				.from(formDefinitions)
				.where(eq(formDefinitions.id, formInfo.formDefId))
				.limit(1);
			if (existing.length) {
				schema = existing[0].schema as FormSchema;
			}
		} else if (formInfo?.schema) {
			schema = formInfo.schema;
		}

		if (!schema) {
			schema = {
				title: `${state} Form`,
				description: "",
				fields: [
					{
						name: "placeholder",
						type: "text",
						label: "Placeholder",
						required: false,
						description: "",
					},
				],
			};
		}

		await dbClient.insert(formDefinitions).values({
			workflowDefId: newWorkflow.id,
			state,
			version: 1,
			schema,
		});
	}

	return newWorkflow;
};

export const workflowDefinition = {
	queries: {
		getWorkflowDefinitions,
		getWorkflowDefinition,
	},
	mutations: {
		createWorkflowDefinition,
	},
};
