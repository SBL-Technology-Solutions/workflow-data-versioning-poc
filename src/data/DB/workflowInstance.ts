import { desc, eq } from "drizzle-orm";
import { createActor, createMachine } from "xstate";
import { DB } from "@/data/DB";
import { dbClient } from "@/db/client";
import {
	workflowDefinitions,
	workflowInstances,
	workflowInstancesSelectSchema,
} from "@/db/schema";
import { ConvertToZodSchemaAndValidate, formatZodErrors } from "@/lib/form";

/**
 * Retrieves all workflow instances ordered by creation date in descending order.
 *
 * @returns An array of the most recently created workflow instance records.
 */
const getWorkflowInstances = async () => {
	return await dbClient
		.select()
		.from(workflowInstances)
		.orderBy(desc(workflowInstances.createdAt));
};

/**
 * Retrieves a workflow instance by its ID, including its current state and associated machine configuration.
 *
 * Throws an error if the workflow instance, its definition ID, or the machine configuration is not found.
 *
 * @param id - The unique identifier of the workflow instance to retrieve
 * @returns An object containing the workflow instance's ID, workflow definition ID, current state, and machine configuration
 */
const getWorkflowInstanceById = async (id: number) => {
	const result = await dbClient
		.select({
			id: workflowInstances.id,
			workflowDefId: workflowInstances.workflowDefId,
			currentState: workflowInstances.currentState,
			machineConfig: workflowDefinitions.machineConfig,
		})
		.from(workflowInstances)
		.leftJoin(
			workflowDefinitions,
			eq(workflowDefinitions.id, workflowInstances.workflowDefId),
		)
		.where(eq(workflowInstances.id, id))
		.limit(1);

	if (!result.length) {
		throw new Error("Workflow instance not found");
	}

	if (!result[0].workflowDefId) {
		throw new Error("Workflow definition ID not found");
	}

	if (!result[0].machineConfig) {
		throw new Error("Workflow definition not found");
	}

	return result[0];
};

const createWorkflowInstance = async (workflowDefId: number) => {
	// First, get the workflow definition to extract the initial state
	const workflowDef = await dbClient
		.select()
		.from(workflowDefinitions)
		.where(eq(workflowDefinitions.id, workflowDefId))
		.limit(1);

	if (!workflowDef[0]) {
		throw new Error(`Workflow definition with id ${workflowDefId} not found`);
	}

	// Extract initial state from the machine config
	const machineConfig = workflowDef[0].machineConfig as {
		initial?: string;
		states: Record<string, any>;
	};

	const initialState =
		machineConfig.initial ?? Object.keys(machineConfig.states)[0];

	const result = await dbClient
		.insert(workflowInstances)
		.values({
			workflowDefId,
			currentState: initialState,
			status: "active",
		})
		.returning();

	return result[0];
};

const sendWorkflowEvent = async (
	instanceId: number,
	formDefId: number,
	event: string,
	formData: Record<string, string>,
) => {
	// Save the form data to the db first so we persist data even if not all of the required data is provided
	await DB.formDataVersion.mutations.saveFormData(
		instanceId,
		formDefId,
		formData,
	);

	// get the workflow instance
	const workflowInstance = await getWorkflowInstanceById(instanceId);
	const formSchema =
		await DB.formDefinition.queries.getFormSchemaById(formDefId);

	// validate the form data against the form schema and throw an error if any of the required fields are not provided
	const validatedData = ConvertToZodSchemaAndValidate(formSchema, formData);

	if (!validatedData.success) {
		throw new Error(`Invalid data provided: ${formatZodErrors(validatedData)}`);
	}

	// create the xstate actor based on the machine config and the current state
	const workflowMachine = createMachine(
		workflowInstance.machineConfig as Record<string, any>,
	);
	const resolvedState = workflowMachine.resolveState({
		value: workflowInstance.currentState,
	});
	const restoredActor = createActor(workflowMachine, {
		snapshot: resolvedState,
	});

	// start the actor
	restoredActor.start();

	// send the event to the actor
	//TODO: Need to handle errors here
	restoredActor.send({ type: event });

	// get the current state
	const persistedSnapshot = restoredActor.getPersistedSnapshot();
	const updatedState = (persistedSnapshot as any).value as string;

	if (workflowInstance.currentState === updatedState) {
		throw new Error("The workflow did not progress forward");
	}

	// persist the updated state to the db
	const result = await dbClient
		.update(workflowInstances)
		.set({
			currentState: updatedState,
			updatedAt: new Date(),
		})
		.where(eq(workflowInstances.id, instanceId))
		.returning();

	restoredActor.stop();
	return result[0];
};

export const workflowInstance = {
	queries: {
		getWorkflowInstanceById,
		getWorkflowInstances,
		workflowInstancesSelectSchema,
	},
	mutations: {
		createWorkflowInstance,
		sendWorkflowEvent,
	},
};
