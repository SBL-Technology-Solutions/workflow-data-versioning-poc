import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
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

// Helper: Migrate compatible form data versions to new form definition
async function migrateCompatibleFormDataVersions(db: Awaited<typeof import("../db")>["dbClient"], workflowDefId: number, state: string, schema: FormSchema, newFormDefId: number) {	const matchingInstances = await db
		.select({
			id: workflowInstances.id,
			currentState: workflowInstances.currentState,
		})
		.from(workflowInstances)
		.where(
			and(
				eq(workflowInstances.workflowDefId, workflowDefId),
				eq(workflowInstances.currentState, state),
			),
		);

	for (const instance of matchingInstances) {
		const latestData = await db
			.select({
				id: formDataVersions.id,
				formDefId: formDataVersions.formDefId,
				data: formDataVersions.data,
				version: formDataVersions.version,
			})
			.from(formDataVersions)
			.innerJoin(
				formDefinitions,
				and(
					eq(formDataVersions.formDefId, formDefinitions.id),
					eq(formDefinitions.state, state),
				),
			)
			.where(eq(formDataVersions.workflowInstanceId, instance.id))
			.orderBy(desc(formDataVersions.version))
			.limit(1);

		if (!latestData.length) continue;

		const oldData = latestData[0].data;
		const oldFields = Object.keys(oldData);
		const newFields = schema.fields.map((f) => f.name);
		const isSuperset = oldFields.every((f) => newFields.includes(f));

		if (isSuperset) {
			await db.insert(formDataVersions).values({
				workflowInstanceId: instance.id,
				formDefId: newFormDefId,
				version: 1,
				data: oldData,
				patch: [],
				createdBy: "system-migration",
			});
		}
	}
}

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

	const [newFormDef] = await db
		.insert(formDefinitions)
		.values({
			workflowDefId,
			state,
			version: nextVersion,
			schema,
		})
		.returning({ id: formDefinitions.id});

	// Migrate compatible form data versions
	try {
		await migrateCompatibleFormDataVersions(db, workflowDefId, state, schema, newFormDef.id);
	} catch (error) {
		console.error('Failed to migrate form data versions:', error);
		// Consider whether to rollback the form definition creation or just log the error
		throw new Error(`Form version created but data migration failed: ${error.message}`);
	}
	
	return [{ id: newFormDef.id }];
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
