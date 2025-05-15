import { formDefinitions, workflowInstances } from "@/db/schema";
import { type FormSchema, FormSchema as zodFormSchema } from "@/types/form";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import z from "zod";

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

export async function getCurrentForm(
	workflowInstanceId: number,
	state: string,
) {
	const { db } = await import("../db");
	// Using the workflowInstanceId, get the latest Form Definition
	// for the current state of the workflow instance
	const result = await db
		.select({
			workflowDefId: workflowInstances.workflowDefId,
			formDefId: formDefinitions.id,
			schema: formDefinitions.schema,
		})
		.from(workflowInstances)
		.leftJoin(
			formDefinitions,
			and(
				eq(formDefinitions.workflowDefId, workflowInstances.workflowDefId),
				eq(formDefinitions.state, state),
			),
		)
		.where(eq(workflowInstances.id, workflowInstanceId))
		.orderBy(desc(formDefinitions.version))
		.limit(1);

	if (!result.length) {
		throw new Error("Workflow instance not found");
	}

	if (!result[0].workflowDefId) {
		throw new Error("Workflow definition ID not found");
	}

	if (!result[0].formDefId) {
		throw new Error(`No form found for state: ${state}`);
	}

	return result[0];
}

export const getCurrentFormServerFn = createServerFn({
	method: "GET",
})
	.validator(
		z.object({
			workflowInstanceId: z.number(),
			state: z.string(),
		}),
	)
	.handler(async ({ data: { workflowInstanceId, state } }) => {
		console.info("Fetching current form");
		return getCurrentForm(workflowInstanceId, state);
	});

export const getCurrentFormQueryOptions = (
	workflowInstanceId: number,
	state: string,
) => ({
	queryKey: ["currentForm", { workflowInstanceId, state }],
	queryFn: () =>
		getCurrentFormServerFn({ data: { workflowInstanceId, state } }),
});

export async function createFormVersion(
	workflowDefId: number,
	state: string,
	schema: FormSchema,
) {
	const { db } = await import("../db");

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
