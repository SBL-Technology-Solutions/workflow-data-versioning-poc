import { and, desc, eq } from "drizzle-orm";
import { dbClient } from "@/db/client";
import { formDefinitions, workflowDefinitions } from "@/db/schema";

type StepMove = "forward" | "backward" | "both" | "terminal";

export interface CreateWorkflowDefinitionStepInput {
	name: string;
	move: StepMove;
	formDefId?: number | null;
}

export interface CreateWorkflowDefinitionInput {
	name: string;
	steps: CreateWorkflowDefinitionStepInput[];
}

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

export const workflowDefinition = {
	queries: {
		getWorkflowDefinitions,
		getWorkflowDefinition,
	},
	mutations: {
        /**
         * Creates a workflow definition from ordered steps with directional rules.
         * - Builds an XState machine config from steps (NEXT/BACK events).
         * - Optionally links existing form definitions by cloning their schema
         *   into the new workflow/state as version 1.
         */
        async createWorkflowDefinition(input: CreateWorkflowDefinitionInput) {
            if (!input.steps.length) throw new Error("At least one step is required");

            // Build machine config
            const initial = input.steps[0].name;
            const states: Record<string, any> = {};

            input.steps.forEach((step, idx) => {
                const on: Record<string, string> = {};
                const hasPrev = idx > 0;
                const hasNext = idx < input.steps.length - 1;

                if ((step.move === "forward" || step.move === "both") && hasNext) {
                    on.NEXT = input.steps[idx + 1].name;
                }
                if ((step.move === "backward" || step.move === "both") && hasPrev) {
                    on.BACK = input.steps[idx - 1].name;
                }

                if (Object.keys(on).length === 0 || step.move === "terminal") {
                    states[step.name] = { type: "final" };
                } else {
                    states[step.name] = { on };
                }
            });

            const machineConfig = { initial, states } as const;

            // Create workflow definition (version starts at 1)
            const [created] = await dbClient
                .insert(workflowDefinitions)
                .values({
                    name: input.name,
                    version: 1,
                    machineConfig: machineConfig as unknown as Record<string, any>,
                })
                .returning();

            // Clone selected form definitions into the new workflow/state as v1
            for (const step of input.steps) {
                if (!step.formDefId) continue;
                const [existing] = await dbClient
                    .select()
                    .from(formDefinitions)
                    .where(eq(formDefinitions.id, step.formDefId))
                    .limit(1);
                if (!existing) continue;

                // Only clone if schema exists; always create as version 1 for new workflow/state
                await dbClient.insert(formDefinitions).values({
                    workflowDefId: created.id,
                    state: step.name,
                    version: 1,
                    schema: existing.schema,
                });
            }

            return created;
        },
    },
};
