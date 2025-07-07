import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gt } from "drizzle-orm";
import z from "zod";
import {
	formDataVersions,
	formDefinitions,
	workflowInstances,
} from "@/db/schema";
import { type FormSchema, FormSchema as zodFormSchema } from "@/lib/form";

export async function getFormDefinitions() {
	const { dbClient: db } = await import("../db");
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
	const { dbClient: db } = await import("../db");

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
			formDataVersions,
			and(
				eq(formDataVersions.formDefId, formDefinitions.id),
				eq(formDataVersions.workflowInstanceId, workflowInstanceId),
			),
		)
		.where(
			and(
				eq(formDefinitions.workflowDefId, instance[0].workflowDefId),
				eq(formDefinitions.state, state),
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
	const { dbClient: db } = await import("../db");

	const result = await db
		.select({
			formDefId: formDefinitions.id,
			schema: formDefinitions.schema,
		})
		.from(formDefinitions)
		.where(
			and(
				eq(formDefinitions.workflowDefId, workflowDefId),
				eq(formDefinitions.state, state),
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
	const { dbClient: db } = await import("../db");

	const currentVersion = await db
		.select()
		.from(formDefinitions)
		.where(
			and(
				eq(formDefinitions.workflowDefId, workflowDefId),
				eq(formDefinitions.state, state),
			),
		)
		.orderBy(desc(formDefinitions.version))
		.limit(1);

	const nextVersion = currentVersion.length ? currentVersion[0].version + 1 : 1;

	const result = await db
		.insert(formDefinitions)
		.values({
			workflowDefId,
			state,
			version: nextVersion,
			schema,
		})
		.returning({ id: formDefinitions.id });

	return result;
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

// get form schema from formDefId
export async function getFormSchema(formDefId: number) {
	const { dbClient } = await import("../db");
	const formDefinition = await dbClient
		.select()
		.from(formDefinitions)
		.where(eq(formDefinitions.id, formDefId))
		.limit(1);

	if (!formDefinition.length) {
		throw new Error(`Form definition with id ${formDefId} not found`);
	}

	return formDefinition[0].schema;
}

// Returns a form definition with a superset of fields if available
export async function getLatestCompatibleFormDefinitionForInstance(
	workflowInstanceId: number,
	state: string,
) {
	const { dbClient: db } = await import("../db");

	// Get the workflow instance to get its workflowDefId
	const instance = await db
		.select({ workflowDefId: workflowInstances.workflowDefId })
		.from(workflowInstances)
		.where(eq(workflowInstances.id, workflowInstanceId))
		.limit(1);

	if (!instance.length) {
		throw new Error("Workflow instance not found");
	}

	// Get the latest form data version for this instance and state
	const latestFormData = await db
		.select({
			formDefId: formDataVersions.formDefId,
			data: formDataVersions.data,
		})
		.from(formDataVersions)
		.innerJoin(
			formDefinitions,
			and(
				eq(formDataVersions.formDefId, formDefinitions.id),
				eq(formDefinitions.state, state),
				eq(formDefinitions.workflowDefId, instance[0].workflowDefId),
			),
		)
		.where(eq(formDataVersions.workflowInstanceId, workflowInstanceId))
		.orderBy(desc(formDataVersions.version))
		.limit(1);

	if (!latestFormData.length) {
		// fallback to current logic
		return getCurrentFormForDefinition(instance[0].workflowDefId, state);
	}

	const currentFormDefId = latestFormData[0].formDefId;
	// Get the schema for the current formDefId
	const currentFormDef = await db
		.select({
			formDefId: formDefinitions.id,
			schema: formDefinitions.schema,
			version: formDefinitions.version,
		})
		.from(formDefinitions)
		.where(eq(formDefinitions.id, currentFormDefId))
		.limit(1);

	if (!currentFormDef.length) {
		throw new Error("Current form definition not found");
	}

	const currentFields = currentFormDef[0].schema.fields.map((f: any) => f.name);
	const currentVersion = currentFormDef[0].version;

	// Get all higher version form definitions for this workflowDefId and state
	const higherFormDefs = await db
		.select({
			formDefId: formDefinitions.id,
			schema: formDefinitions.schema,
			version: formDefinitions.version,
		})
		.from(formDefinitions)
		.where(
			and(
				eq(formDefinitions.workflowDefId, instance[0].workflowDefId),
				eq(formDefinitions.state, state),
				gt(formDefinitions.version, currentVersion),
			),
		)
		.orderBy(desc(formDefinitions.version));

	// Find the first higher version form definition that is a superset of the current fields
	const supersetDef = higherFormDefs.find(def => {
		const defFields = def.schema.fields.map((f: any) => f.name);
		return currentFields.every((f: string) => defFields.includes(f));
	});

	// Return the first (highest version) superset if any, otherwise the current one
	if (supersetDef) {
		return supersetDef;
	}

	// If none found, return the current one
	return currentFormDef[0];
}

export const getLatestCompatibleFormDefinitionForInstanceServerFn = createServerFn({
	method: "GET",
})
	.validator(
		z.object({
			workflowInstanceId: z.number(),
			state: z.string(),
		}),
	)
	.handler(async ({ data: { workflowInstanceId, state } }) => {
		return getLatestCompatibleFormDefinitionForInstance(workflowInstanceId, state);
	});

export const getLatestCompatibleFormDefinitionForInstanceQueryOptions = (
	workflowInstanceId: number,
	state: string,
) => ({
	queryKey: ["latestCompatibleFormDefinitionForInstance", { workflowInstanceId, state }],
	queryFn: () =>
		getLatestCompatibleFormDefinitionForInstanceServerFn({ data: { workflowInstanceId, state } }),
});
