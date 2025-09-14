import { eq } from "drizzle-orm";
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
import { setupTestDb } from "./testDb";

// Mock server-only helper to avoid HTTPEvent errors in tests when DB layer calls it
vi.mock("@tanstack/react-start/server", () => ({
	setResponseStatus: (_code: number) => {},
}));

describe("DB.workflowInstance", () => {
	let ctx: import("./testDb").TestDbContext;
	let db: ReturnType<typeof import("drizzle-orm/node-postgres")["drizzle"]>;
	let DB: typeof import("@/data/DB")["DB"];

	const machineConfig = {
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
		const { cleanupTestDb } = await import("./testDb");
		await cleanupTestDb(ctx);
	});

	beforeEach(async () => {
		const { truncateAllTables } = await import("./testDb");
		await truncateAllTables(db);
	});

	it("getWorkflowInstances: returns empty then sorts by createdAt desc", async () => {
		const { DB } = await import("@/data/DB");
		const empty = await DB.workflowInstance.queries.getWorkflowInstances();
		expect(empty).toEqual([]);

		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		await db.insert(workflowInstances).values({
			workflowDefId,
			currentState: "form1",
			createdBy: "system",
			updatedBy: "system",
			createdAt: new Date("2025-01-01T00:00:00.000Z"),
		});
		await db.insert(workflowInstances).values({
			workflowDefId,
			currentState: "form1",
			createdBy: "system",
			updatedBy: "system",
			createdAt: new Date("2025-01-02T00:00:00.000Z"),
		});

		const rows = await DB.workflowInstance.queries.getWorkflowInstances();
		expect(rows).toHaveLength(2);
		expect(new Date(rows[0].createdAt).toISOString()).toBe(
			new Date("2025-01-02T00:00:00.000Z").toISOString(),
		);
	});

	it("getWorkflowInstanceById: returns instance with machine config", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		const [{ id: instanceId }] = await db
			.insert(workflowInstances)
			.values({
				workflowDefId,
				currentState: "form1",
				createdBy: "system",
				updatedBy: "system",
			})
			.returning();

		const { DB } = await import("@/data/DB");
		const result =
			await DB.workflowInstance.queries.getWorkflowInstanceById(instanceId);

		expect(result.id).toBe(instanceId);
		expect(result.workflowDefId).toBe(workflowDefId);
		expect(result.currentState).toBe("form1");
		expect(result.machineConfig).toEqual(machineConfig);
	});

	it("getWorkflowInstanceById: throws for missing instance", async () => {
		await expect(
			DB.workflowInstance.queries.getWorkflowInstanceById(9999),
		).rejects.toThrow(/Workflow instance not found/);
	});

	it("createWorkflowInstance: happy path", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		const created =
			await DB.workflowInstance.mutations.createWorkflowInstance(workflowDefId);

		expect(created.workflowDefId).toBe(workflowDefId);
		expect(created.currentState).toBe("form1");
		expect(created.createdBy).toBe("system");
		expect(created.updatedBy).toBe("system");
	});

	it("createWorkflowInstance: falls back to first state when initial is missing", async () => {
		const machineConfigNoInitial = {
			states: {
				s1: { on: { NEXT: "s2" } },
				s2: { type: "final" },
			},
		} as const;

		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({
				name: "WF2",
				version: 1,
				machineConfig: machineConfigNoInitial,
				createdBy: "system",
			})
			.returning();

		const created =
			await DB.workflowInstance.mutations.createWorkflowInstance(workflowDefId);

		expect(created.currentState).toBe("s1");
	});

	it("sendWorkflowEvent: saves data and progresses state on valid input", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		const [{ id: formDef1 }] = await db
			.insert(formDefinitions)
			.values({
				state: "form1",
				version: 1,
				schema: formSchemaV1,
				createdBy: "system",
			})
			.returning();
		const [{ id: formDef2 }] = await db
			.insert(formDefinitions)
			.values({
				state: "form2",
				version: 1,
				schema: formSchemaV2,
				createdBy: "system",
			})
			.returning();

		await db.insert(workflowDefinitionsFormDefinitionsMap).values([
			{
				workflowDefinitionId: workflowDefId,
				formDefinitionId: formDef1,
				createdBy: "system",
				updatedBy: "system",
			},
			{
				workflowDefinitionId: workflowDefId,
				formDefinitionId: formDef2,
				createdBy: "system",
				updatedBy: "system",
			},
		]);

		const created =
			await DB.workflowInstance.mutations.createWorkflowInstance(workflowDefId);

		const updated = await DB.workflowInstance.mutations.sendWorkflowEvent(
			created.id,
			formDef1,
			"NEXT",
			{ firstName: "Alice" },
		);

		expect(updated.currentState).toBe("form2");

		// Verify a data version was saved
		const saved = await db
			.select()
			.from(formDataVersions)
			.where(eq(formDataVersions.workflowInstanceId, created.id));
		expect(saved).toHaveLength(1);
		expect(saved[0].data).toEqual({ firstName: "Alice" });
		expect(saved[0].version).toBe(1);
	});

	it("sendWorkflowEvent: saves partial data then rejects invalid input", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		const [{ id: formDef1 }] = await db
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
			formDefinitionId: formDef1,
			createdBy: "system",
			updatedBy: "system",
		});

		const created =
			await DB.workflowInstance.mutations.createWorkflowInstance(workflowDefId);

		await expect(
			DB.workflowInstance.mutations.sendWorkflowEvent(
				created.id,
				formDef1,
				"NEXT",
				{},
			),
		).rejects.toThrow(/Invalid data provided:/);

		const saved = await db
			.select()
			.from(formDataVersions)
			.where(eq(formDataVersions.workflowInstanceId, created.id));
		expect(saved).toHaveLength(1);
		expect(saved[0].data).toEqual({});
		expect(saved[0].version).toBe(1);
	});

	it("sendWorkflowEvent: throws when workflow does not progress", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		const [{ id: formDef1 }] = await db
			.insert(formDefinitions)
			.values({
				state: "form1",
				version: 1,
				schema: formSchemaV1,
				createdBy: "system",
			})
			.returning();
		const [{ id: formDef2 }] = await db
			.insert(formDefinitions)
			.values({
				state: "form2",
				version: 1,
				schema: formSchemaV2,
				createdBy: "system",
			})
			.returning();

		await db.insert(workflowDefinitionsFormDefinitionsMap).values([
			{
				workflowDefinitionId: workflowDefId,
				formDefinitionId: formDef1,
				createdBy: "system",
				updatedBy: "system",
			},
			{
				workflowDefinitionId: workflowDefId,
				formDefinitionId: formDef2,
				createdBy: "system",
				updatedBy: "system",
			},
		]);

		const created =
			await DB.workflowInstance.mutations.createWorkflowInstance(workflowDefId);

		await DB.workflowInstance.mutations.sendWorkflowEvent(
			created.id,
			formDef1,
			"NEXT",
			{ firstName: "Alice" },
		);

		await expect(
			DB.workflowInstance.mutations.sendWorkflowEvent(
				created.id,
				formDef2,
				"NEXT",
				{ firstName: "Alice" },
			),
		).rejects.toThrow(/did not progress/);
	});

	it("sendWorkflowEvent: handles actor send errors but preserves saved data", async () => {
		// Arrange workflow + forms
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({
				name: "WF_ERR",
				version: 1,
				machineConfig,
				createdBy: "system",
			})
			.returning();

		const [{ id: formDef1 }] = await db
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
			formDefinitionId: formDef1,
			createdBy: "system",
			updatedBy: "system",
		});

		const created =
			await DB.workflowInstance.mutations.createWorkflowInstance(workflowDefId);

		// Act + Assert: Use invalid event to trigger error
		await expect(
			DB.workflowInstance.mutations.sendWorkflowEvent(
				created.id,
				formDef1,
				"INVALID_EVENT", // This will cause the workflow to fail
				{ firstName: "Alice" },
			),
		).rejects.toThrow();

		// Assert: form data was still saved before the failure
		const saved = await db
			.select()
			.from(formDataVersions)
			.where(eq(formDataVersions.workflowInstanceId, created.id));
		expect(saved).toHaveLength(1);
		expect(saved[0].data).toEqual({ firstName: "Alice" });
		expect(saved[0].version).toBe(1);
	});
});
