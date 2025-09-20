import { setResponseStatus } from "@tanstack/react-start/server";
import { desc, eq } from "drizzle-orm";
import { createActor, createMachine, type Snapshot } from "xstate";
import { DB } from "@/data/DB";
import { dbClient } from "@/db/client";
import {
	type FormDataVersionsInsert,
	type FormDefinitionsSelect,
	type WorkflowDefinitionsSelect,
	type WorkflowInstancesSelect,
	workflowDefinitions,
	workflowInstances,
	workflowInstancesSelectSchema,
} from "@/db/schema";
import { ConvertToZodSchemaAndValidate, formatZodErrors } from "@/lib/form";
import { toMachineConfig } from "@/types/workflow";

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
const getWorkflowInstanceById = async (id: WorkflowInstancesSelect["id"]) => {
	const [workflowInstance] = await dbClient
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

	if (!workflowInstance) {
		throw new Error("Workflow instance not found");
	}

	if (!workflowInstance.workflowDefId) {
		throw new Error("Workflow definition ID not found");
	}

	if (!workflowInstance.machineConfig) {
		throw new Error("Workflow definition not found");
	}

	return workflowInstance;
};

const createWorkflowInstance = async (
	workflowDefId: WorkflowDefinitionsSelect["id"],
) => {
	// First, get the workflow definition to extract the initial state
	const [workflowDef] = await dbClient
		.select()
		.from(workflowDefinitions)
		.where(eq(workflowDefinitions.id, workflowDefId))
		.limit(1);

	if (!workflowDef) {
		setResponseStatus(404);
		throw new Error(`Workflow definition with id ${workflowDefId} not found`);
	}

	const machineConfig = workflowDef.machineConfig;

	const initialState =
		machineConfig?.initial ?? Object.keys(machineConfig?.states ?? {})[0];

	if (!initialState || typeof initialState !== "string") {
		setResponseStatus(404);
		throw new Error(
			`Invalid machine config missing initial state: ${machineConfig}`,
		);
	}

	const [createdWorkflowInstance] = await dbClient
		.insert(workflowInstances)
		.values({
			workflowDefId,
			currentState: initialState,
			createdBy: "system",
			updatedBy: "system",
		})
		.returning();

	return createdWorkflowInstance;
};

const sendWorkflowEvent = async (
	instanceId: WorkflowInstancesSelect["id"],
	formDefId: FormDefinitionsSelect["id"],
	event: string,
	formData: FormDataVersionsInsert["data"],
) => {
	// Save the form data to the db first so we persist data even if not all of the required data is provided
	await DB.formDataVersion.mutations.saveFormData(
		instanceId,
		formDefId,
		formData,
	);

	// get the workflow instance
	const workflowInstance = await getWorkflowInstanceById(instanceId);
	const formDefinition =
		await DB.formDefinition.queries.getFormDefinitionById(formDefId);

	// validate the form data against the form schema and throw an error if any of the required fields are not provided
	const validatedData = ConvertToZodSchemaAndValidate(
		formDefinition.schema,
		formData,
	);

	if (!validatedData.success) {
		setResponseStatus(400);
		throw new Error(`Invalid data provided: ${formatZodErrors(validatedData)}`);
	}

	if (!workflowInstance.machineConfig) {
		setResponseStatus(400);
		throw new Error("Machine config is missing");
	}

	// create the xstate actor based on the machine config and the current state
	const workflowMachine = createMachine(
		toMachineConfig(workflowInstance.machineConfig),
	);
	const resolvedState = workflowMachine.resolveState({
		value: workflowInstance.currentState,
	});
	const restoredActor = createActor(workflowMachine, {
		snapshot: resolvedState,
	});

	// start the actor
	restoredActor.start();

	// send the event to the actor with error handling
	try {
		restoredActor.send({ type: event });
		// get the current state
		const persistedSnapshot =
			restoredActor.getPersistedSnapshot() as Snapshot<unknown> & {
				value: string;
			};
		const updatedState = persistedSnapshot.value;

		if (workflowInstance.currentState === updatedState) {
			throw new Error("The workflow did not progress forward");
		}

		// persist the updated state to the db
		const [updatedWorkflowInstance] = await dbClient
			.update(workflowInstances)
			.set({
				currentState: updatedState,
				updatedAt: new Date(),
			})
			.where(eq(workflowInstances.id, instanceId))
			.returning();

		return updatedWorkflowInstance;
	} catch (err) {
		setResponseStatus(400);
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(
			`Failed to process event "${event}" from state "${workflowInstance.currentState}": ${message}`,
		);
	} finally {
		restoredActor.stop();
	}
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
