import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { createActor, createMachine, StateMachine } from "xstate";
import * as z from "zod/v4";
import { ConvertToZodSchemaAndValidate, formatZodErrors } from "@/lib/form";
import { workflowDefinitions, workflowInstances } from "../db/schema";
import { saveFormData } from "./formDataVersions";
import { getFormSchema } from "./formDefinitions";
export async function getWorkflowInstance(id: number) {
	const { dbClient: db } = await import("../db");
	const result = await db
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
}

const workflowInstanceIdSchema = z
	.string()
	.transform((val) => Number.parseInt(val, 10));

export const fetchWorkflowInstance = createServerFn({
	method: "GET",
})
	.validator(workflowInstanceIdSchema)
	.handler(async ({ data: workflowInstanceId }) => {
		return getWorkflowInstance(workflowInstanceId);
	});

export type WorkflowInstance = Awaited<
	ReturnType<typeof fetchWorkflowInstance>
>;

export const fetchWorkflowInstanceQueryOptions = (instanceId: string) =>
	queryOptions({
		queryKey: ["workflowInstance", instanceId],
		queryFn: () => fetchWorkflowInstance({ data: instanceId }),
	});

export async function listWorkflowInstances() {
	const { dbClient: db } = await import("../db");
	return await db
		.select()
		.from(workflowInstances)
		.orderBy(desc(workflowInstances.createdAt))
		.limit(5);
}

export const fetchWorkflowInstances = createServerFn({
	method: "GET",
}).handler(async () => {
	console.info("Fetching workflow Instances");
	return listWorkflowInstances();
});

export const workflowInstancesQueryOptions = () =>
	queryOptions({
		queryKey: ["workflowInstances", { limit: 5 }],
		queryFn: () => fetchWorkflowInstances(),
	});

export async function updateWorkflowState(id: number, newState: string) {
	const { dbClient: db } = await import("../db");
	const result = await db
		.update(workflowInstances)
		.set({
			currentState: newState,
			updatedAt: new Date(),
		})
		.where(eq(workflowInstances.id, id))
		.returning({ id: workflowInstances.id });

	return result;
}

export const updateWorkflowStateServerFn = createServerFn({
	method: "POST",
})
	.validator(
		z.object({
			id: z.number(),
			newState: z.string(),
		}),
	)
	.handler(async ({ data: { id, newState } }) => {
		return updateWorkflowState(id, newState);
	});

export async function createWorkflowInstance(workflowDefId: number) {
	const { dbClient: db } = await import("../db");

	// First, get the workflow definition to extract the initial state
	const workflowDef = await db
		.select()
		.from(workflowDefinitions)
		.where(eq(workflowDefinitions.id, workflowDefId))
		.limit(1);

	if (!workflowDef[0]) {
		throw new Error(`Workflow definition with id ${workflowDefId} not found`);
	}

	// Extract initial state from the machine config
	const machineConfig = workflowDef[0].machineConfig as any;
	const initialState =
		machineConfig.initial || Object.keys(machineConfig.states)[0];

	const result = await db
		.insert(workflowInstances)
		.values({
			workflowDefId,
			currentState: initialState,
			status: "active",
		})
		.returning();

	return result[0];
}

export const createWorkflowInstanceServerFn = createServerFn({
	method: "POST",
})
	.validator(
		z.object({
			workflowDefId: z.number(),
		}),
	)
	.handler(async ({ data: { workflowDefId } }) => {
		return createWorkflowInstance(workflowDefId);
	});

export const sendWorkflowEvent = async (
	instanceId: number,
	formDefId: number,
	event: string,
	formData: Record<string, string>,
) => {
	const { dbClient } = await import("../db");

	// Save the form data to the db first so we persist data even if not all of the required data is provided
	await saveFormData(instanceId, formDefId, formData);

	// get the workflow instance
	const workflowInstance = await getWorkflowInstance(instanceId);
	const formSchema = await getFormSchema(formDefId);

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
	console.log("resolvedState", resolvedState);
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
	const updatedState = (persistedSnapshot as any).value;

	if (workflowInstance.currentState === updatedState) {
		throw new Error("The workflow did not progress forward");
	}

	console.log("currentState", updatedState);

	// persit the updated state to the db
	const result = await dbClient
		.update(workflowInstances)
		.set({
			currentState: updatedState,
			updatedAt: new Date(),
		})
		.where(eq(workflowInstances.id, instanceId))
		.returning();
	console.log("result after persisting", result);
	restoredActor.stop();
	return result[0];
};

export const sendWorkflowEventServerFn = createServerFn({
	method: "POST",
})
	.validator(
		z.object({
			instanceId: z.number(),
			event: z.string(),
			formDefId: z.number(),
			formData: z.record(z.string(), z.string()),
		}),
	)
	.handler(async ({ data: { instanceId, event, formData, formDefId } }) => {
		return sendWorkflowEvent(instanceId, formDefId, event, formData);
	});
