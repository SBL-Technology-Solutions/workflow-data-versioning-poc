import { and, eq } from "drizzle-orm";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	formDataVersions,
	formDefinitions,
	workflowDefinitions,
	workflowDefinitionsFormDefinitionsMap,
	workflowInstances,
} from "@/db/schema";
import type { FormSchema } from "@/lib/form";
import type { SerializableWorkflowMachineConfig } from "@/types/workflow";
import {
	cleanupTestDb,
	setupTestDb,
	type TestDbContext,
	truncateAllTables,
} from "./testDb";

// Mock server-only helper to avoid HTTPEvent errors in tests
const setResponseStatus = vi.fn();
vi.mock("@tanstack/react-start/server", () => ({ setResponseStatus }));

describe("DB.formDefinition", () => {
	let ctx: TestDbContext;
	let db: ReturnType<typeof import("drizzle-orm/node-postgres")["drizzle"]>;
	let DB: typeof import("@/data/DB")["DB"];

	const machineConfig: SerializableWorkflowMachineConfig = {
		initial: "form1",
		states: {
			form1: { on: { NEXT: "form2" } },
			form2: { type: "final" },
		},
	} as const;

	const formSchemaV1: FormSchema = {
		title: "Form V1",
		fields: [
			{ name: "firstName", type: "text", label: "First Name", required: true },
		],
	};

	const formSchemaV2: FormSchema = {
		title: "Form V2",
		fields: [
			{ name: "firstName", type: "text", label: "First Name", required: true },
			{ name: "lastName", type: "text", label: "Last Name", required: false },
		],
	};

	beforeAll(async () => {
		ctx = await setupTestDb();
		db = ctx.db;
		({ DB } = await import("@/data/DB"));
	});

	afterAll(async () => {
		await cleanupTestDb(ctx);
	});

	beforeEach(async () => {
		await truncateAllTables(db);
	});

	it("getFormDefinitions: returns empty then sorts by createdAt desc", async () => {
		const empty = await DB.formDefinition.queries.getFormDefinitions();
		expect(empty).toEqual([]);

		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		const [{ id: v1 }] = await db
			.insert(formDefinitions)
			.values({
				state: "form1",
				version: 1,
				schema: formSchemaV1,
				createdAt: new Date("2025-01-01T00:00:00.000Z"),
				createdBy: "system",
			})
			.returning();
		const [{ id: v2 }] = await db
			.insert(formDefinitions)
			.values({
				state: "form1",
				version: 2,
				schema: formSchemaV2,
				createdAt: new Date("2025-01-02T00:00:00.000Z"),
				createdBy: "system",
			})
			.returning();

		await db.insert(workflowDefinitionsFormDefinitionsMap).values([
			{
				workflowDefinitionId: workflowDefId,
				formDefinitionId: v1,
				createdBy: "system",
				updatedBy: "system",
			},
			{
				workflowDefinitionId: workflowDefId,
				formDefinitionId: v2,
				createdBy: "system",
				updatedBy: "system",
			},
		]);

		const defs = await DB.formDefinition.queries.getFormDefinitions();
		expect(defs).toHaveLength(2);
		expect(new Date(defs[0].createdAt).toISOString()).toBe(
			new Date("2025-01-02T00:00:00.000Z").toISOString(),
		);
		expect(defs.map((d) => d.version)).toEqual([2, 1]);
	});

	it("getCurrentFormForWorkflowDefId: throws when workflow definition missing", async () => {
		await expect(
			DB.formDefinition.queries.getCurrentFormForWorkflowDefId(9999, "form1"),
		).rejects.toThrow(/No Workflow Definition found/);
		expect(setResponseStatus).toHaveBeenCalledWith(404);
	});

	it("getCurrentFormForWorkflowDefId: throws Invalid States when no states present", async () => {
		// states is empty
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({
				name: "WF",
				version: 1,
				machineConfig: { states: {} },
				createdBy: "system",
			})
			.returning();

		await expect(
			DB.formDefinition.queries.getCurrentFormForWorkflowDefId(workflowDefId),
		).rejects.toThrow(/Invalid States/);
		expect(setResponseStatus).toHaveBeenCalledWith(404);
	});

	it("getCurrentFormForWorkflowDefId: throws Invalid State when state has no form definition", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		await expect(
			DB.formDefinition.queries.getCurrentFormForWorkflowDefId(
				workflowDefId,
				"form1",
			),
		).rejects.toThrow(/Invalid State: form1/);
		expect(setResponseStatus).toHaveBeenCalledWith(404);
	});

	it("getCurrentFormForWorkflowDefId: returns latest formDef for state; defaults to first state when omitted", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		const [{ id: v1 }] = await db
			.insert(formDefinitions)
			.values({
				state: "form1",
				version: 1,
				schema: formSchemaV1,
				createdBy: "system",
			})
			.returning();
		const [{ id: v2 }] = await db
			.insert(formDefinitions)
			.values({
				state: "form1",
				version: 2,
				schema: formSchemaV2,
				createdBy: "system",
			})
			.returning();

		await db.insert(workflowDefinitionsFormDefinitionsMap).values({
			workflowDefinitionId: workflowDefId,
			formDefinitionId: v1,
			createdBy: "system",
			updatedBy: "system",
		});
		await db.insert(workflowDefinitionsFormDefinitionsMap).values({
			workflowDefinitionId: workflowDefId,
			formDefinitionId: v2,
			createdBy: "system",
			updatedBy: "system",
		});

		const explicit =
			await DB.formDefinition.queries.getCurrentFormForWorkflowDefId(
				workflowDefId,
				"form1",
			);
		expect(explicit?.formDefId).toBe(v2);
		expect(explicit?.version).toBe(2);

		const implicit =
			await DB.formDefinition.queries.getCurrentFormForWorkflowDefId(
				workflowDefId,
			);
		expect(implicit?.formDefId).toBe(v2);
		expect(implicit?.state).toBe("form1");
	});

	it("getFormDefinitionById: returns schema; throws for missing id", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		const [{ id: formDefId }] = await db
			.insert(formDefinitions)
			.values({
				state: "form1",
				version: 1,
				schema: formSchemaV1,
				createdBy: "system",
			})
			.returning();

		await db.insert(workflowDefinitionsFormDefinitionsMap).values({
			workflowDefinitionId: workflowDefId,
			formDefinitionId: formDefId,
			createdBy: "system",
			updatedBy: "system",
		});

		const formDefinition =
			await DB.formDefinition.queries.getFormDefinitionById(formDefId);
		expect(formDefinition.schema).toEqual(formSchemaV1);

		await expect(
			DB.formDefinition.queries.getFormDefinitionById(123456),
		).rejects.toThrow(/Form definition with id 123456 not found/);
		expect(setResponseStatus).toHaveBeenCalledWith(404);
	});

	it("createFormVersion: increments version and migrates compatible data", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		// Seed v1 and instance with data
		const [{ id: v1 }] = await db
			.insert(formDefinitions)
			.values({
				state: "form1",
				version: 1,
				schema: formSchemaV1,
				createdBy: "system",
			})
			.returning();

		await db.insert(workflowDefinitionsFormDefinitionsMap).values({
			workflowDefinitionId: workflowDefId,
			formDefinitionId: v1,
			createdBy: "system",
			updatedBy: "system",
		});

		const [{ id: instanceId }] = await db
			.insert(workflowInstances)
			.values({
				workflowDefId,
				currentState: "form1",
				createdBy: "system",
				updatedBy: "system",
			})
			.returning();
		await db.insert(formDataVersions).values({
			workflowInstanceId: instanceId,
			formDefId: v1,
			version: 1,
			data: { firstName: "Alice" },
			patch: [],
			createdBy: "system",
		});

		// Create v2 (superset schema) and expect migration row for instance
		const created = await DB.formDefinition.mutations.createFormVersion(
			workflowDefId,
			"form1",
			formSchemaV2,
		);
		expect(created[0].id).toBeDefined();

		// Verify next version is 2
		const rec = await db
			.select()
			.from(formDefinitions)
			.where(eq(formDefinitions.id, created[0].id))
			.limit(1);
		expect(rec[0].version).toBe(2);

		// Verify migration inserted data for new formDef
		const allForInstance = await db
			.select()
			.from(formDataVersions)
			.where(eq(formDataVersions.workflowInstanceId, instanceId));
		expect(allForInstance).toHaveLength(2);
		const migrated = await db
			.select()
			.from(formDataVersions)
			.where(
				and(
					eq(formDataVersions.workflowInstanceId, instanceId),
					eq(formDataVersions.formDefId, created[0].id),
				),
			)
			.limit(1);
		expect(migrated[0].version).toBe(1);
		expect(migrated[0].data).toEqual({ firstName: "Alice" });
		expect(migrated[0].createdBy).toBe("system-migration");
	});

	it("createFormVersion: does not migrate if new schema is not superset", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		// Seed v1 with firstName
		const [{ id: v1 }] = await db
			.insert(formDefinitions)
			.values({
				state: "form1",
				version: 1,
				schema: formSchemaV1,
				createdBy: "system",
			})
			.returning();
		await db.insert(workflowDefinitionsFormDefinitionsMap).values({
			workflowDefinitionId: workflowDefId,
			formDefinitionId: v1,
			createdBy: "system",
			updatedBy: "system",
		});
		const [{ id: instanceId }] = await db
			.insert(workflowInstances)
			.values({
				workflowDefId,
				currentState: "form1",
				createdBy: "system",
				updatedBy: "system",
			})
			.returning();
		await db.insert(formDataVersions).values({
			workflowInstanceId: instanceId,
			formDefId: v1,
			version: 1,
			data: { firstName: "X" },
			patch: [],
			createdBy: "system",
		});

		// New schema drops firstName: not a superset
		const incompatible: FormSchema = {
			title: "Form V3",
			fields: [
				{ name: "lastName", type: "text", label: "Last Name", required: false },
			],
		};

		const created = await DB.formDefinition.mutations.createFormVersion(
			workflowDefId,
			"form1",
			incompatible,
		);

		// Ensure no additional migration rows were added for the new form def
		const migrated = await db
			.select()
			.from(formDataVersions)
			.where(eq(formDataVersions.workflowInstanceId, instanceId));
		expect(migrated).toHaveLength(1);
		// sanity: the new form def exists and version advanced
		const rec = await db
			.select()
			.from(formDefinitions)
			.where(eq(formDefinitions.id, created[0].id))
			.limit(1);
		expect(rec[0].version).toBe(2);
	});
});
