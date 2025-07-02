import {
	formDataVersions,
	formDefinitions,
	workflowFormDefinitions,
	workflowInstances,
} from "@/db/schema";
import { type FormSchema, FormSchema as zodFormSchema } from "@/types/form";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import z from "zod";
import { db } from "../db";

export async function getFormDefinitions() {
	const { db } = await import("../db");
	return await db.query.formDefinitions.findMany({
		orderBy: desc(formDefinitions.createdAt),
		limit: 5,
	});
}

export const fetchFormDefinitions = createServerFn({
	method: "GET",
}).handler(async () => {
	console.info("Fetching form definitions");
	return getFormDefinitions();
});

export const formDefinitionsQueryOptions = () => ({
	queryKey: ["formDefinitions", { limit: 5 }],
	queryFn: () => fetchFormDefinitions(),
});

// For workflow instances - gets the latest form definition that has data for the instance
export async function getCurrentFormForInstance(
	workflowInstanceId: number,
	state: string,
) {
	// First get the workflow instance to get its workflowDefId
	const instance = await db
		.select({
			workflowDefId: workflowInstances.workflowDefId,
		})
		.from(workflowInstances)
		.where(eq(workflowInstances.id, workflowInstanceId))
		.limit(1);

	if (!instance.length) {
		throw new Error("Workflow instance not found");
	}

	// Get the latest form definition that has data for this instance and state
	const result = await db
		.select({
			formDefId: formDefinitions.id,
			schema: formDefinitions.schema,
		})
		.from(formDefinitions)
		.innerJoin(
			workflowFormDefinitions,
			and(
				eq(workflowFormDefinitions.formDefId, formDefinitions.id),
				eq(workflowFormDefinitions.workflowDefId, instance[0].workflowDefId),
				eq(workflowFormDefinitions.state, state),
			),
		)
		.orderBy(desc(formDefinitions.version))
		.limit(1);

	// If no form with data exists, fall back to getting the latest form definition
	if (!result.length) {
		return getCurrentFormForDefinition(instance[0].workflowDefId, state);
	}

	return result[0];
}

// For admin form editor - gets the latest form definition for a workflow definition
export async function getCurrentFormForDefinition(
	workflowDefId: number,
	state: string,
) {
	const result = await db
		.select({
			formDefId: formDefinitions.id,
			schema: formDefinitions.schema,
		})
		.from(formDefinitions)
		.innerJoin(
			workflowFormDefinitions,
			and(
				eq(workflowFormDefinitions.formDefId, formDefinitions.id),
				eq(workflowFormDefinitions.workflowDefId, workflowDefId),
				eq(workflowFormDefinitions.state, state),
			),
		)
		.orderBy(desc(formDefinitions.version))
		.limit(1);

	if (!result.length) {
		throw new Error(`No form found for state: ${state}`);
	}

	return result[0];
}

export const getCurrentFormForInstanceServerFn = createServerFn({
	method: "GET",
})
	.validator(
		z.object({
			workflowInstanceId: z.number(),
			state: z.string(),
		}),
	)
	.handler(async ({ data: { workflowInstanceId, state } }) => {
		console.info("Fetching current form for instance");
		return getCurrentFormForInstance(workflowInstanceId, state);
	});

export const getCurrentFormForDefinitionServerFn = createServerFn({
	method: "GET",
})
	.validator(
		z.object({
			workflowDefId: z.number(),
			state: z.string(),
		}),
	)
	.handler(async ({ data: { workflowDefId, state } }) => {
		console.info("Fetching current form for definition");
		return getCurrentFormForDefinition(workflowDefId, state);
	});

export const getCurrentFormForInstanceQueryOptions = (
	workflowInstanceId: number,
	state: string,
) => ({
	queryKey: ["currentFormForInstance", { workflowInstanceId, state }],
	queryFn: () =>
		getCurrentFormForInstanceServerFn({ data: { workflowInstanceId, state } }),
});

export const getCurrentFormForDefinitionQueryOptions = (
	workflowDefId: number,
	state: string,
) => ({
	queryKey: ["currentFormForDefinition", { workflowDefId, state }],
	queryFn: () =>
		getCurrentFormForDefinitionServerFn({ data: { workflowDefId, state } }),
});

export async function createFormVersion(
	workflowDefId: number,
	state: string,
	schema: FormSchema,
) {
	const currentVersion = await db
		.select()
		.from(formDefinitions)
		.innerJoin(
			workflowFormDefinitions,
			and(
				eq(workflowFormDefinitions.formDefId, formDefinitions.id),
				eq(workflowFormDefinitions.workflowDefId, workflowDefId),
				eq(workflowFormDefinitions.state, state),
			),
		)
		.orderBy(desc(formDefinitions.version))
		.limit(1);

	const nextVersion = currentVersion.length ? currentVersion[0].version + 1 : 1;

	// Create new form definition
	const [formDef] = await db
		.insert(formDefinitions)
		.values({
			version: nextVersion,
			schema,
		})
		.returning({ id: formDefinitions.id });

	// Create workflow form definition association
	await db.insert(workflowFormDefinitions).values({
		workflowDefId,
		formDefId: formDef.id,
		state,
	});

	return formDef;
}

export const createFormVersionServerFn = createServerFn({
	method: "POST",
})
	.validator(
		z.object({
			workflowDefId: z.number(),
			state: z.string(),
			schema: zodFormSchema,
		}),
	)
	.handler(async ({ data: { workflowDefId, state, schema } }) =>
		createFormVersion(workflowDefId, state, schema),
	);
