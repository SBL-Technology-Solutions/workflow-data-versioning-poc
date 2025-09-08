import { and, eq } from "drizzle-orm";
import type { Operation } from "fast-json-patch";
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
import { cleanupTestDb, setupTestDb, type TestDbContext } from "./testDb";

// Mock server-only helper to avoid HTTPEvent errors in tests
vi.mock("@tanstack/react-start/server", () => ({
	setResponseStatus: (_code: number) => {},
}));

describe("DB.formDataVersion.getCurrentFormDataForWorkflowInstance", () => {
	let ctx: TestDbContext;
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
		description: "v1",
		fields: [
			{
				name: "firstName",
				type: "text",
				label: "First Name",
				required: true,
			},
		],
	} as const;

	const formSchemaV2: FormSchema = {
		title: "Form V2",
		description: "v2",
		fields: [
			{ name: "firstName", type: "text", label: "First Name", required: true },
			{ name: "lastName", type: "text", label: "Last Name", required: false },
		],
	} as const;

	beforeAll(async () => {
		ctx = await setupTestDb();
		db = ctx.db;
		({ DB } = await import("@/data/DB"));
	});

	afterAll(async () => {
		await cleanupTestDb(ctx);
	});

	beforeEach(async () => {
		const { truncateAllTables } = await import("./testDb");
		await truncateAllTables(db);
	});

	it("returns latest form definition when no saved data exists for the instance/state", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		const [{ id: formDefV1Id }, { id: formDefV2Id }] = await db
			.insert(formDefinitions)
			.values([
				{
					state: "form1",
					version: 1,
					schema: formSchemaV1,
					createdBy: "system",
				},
				{
					state: "form1",
					version: 2,
					schema: formSchemaV2,
					createdBy: "system",
				},
			])
			.returning();

		await db.insert(workflowDefinitionsFormDefinitionsMap).values([
			{
				workflowDefinitionId: workflowDefId,
				formDefinitionId: formDefV1Id,
				createdBy: "system",
				updatedBy: "system",
			},
			{
				workflowDefinitionId: workflowDefId,
				formDefinitionId: formDefV2Id,
				createdBy: "system",
				updatedBy: "system",
			},
		]);

		const [{ id: instanceId }] = await db
			.insert(workflowInstances)
			.values({
				workflowDefId,
				currentState: "form1",
				createdBy: "system",
				updatedBy: "system",
			})
			.returning();

		const result =
			await DB.formDataVersion.queries.getCurrentFormDataForWorkflowInstance(
				instanceId,
				"form1",
			);

		expect(result?.formDefinitionId).toBe(formDefV2Id);
		expect(result?.formDefinitionId).not.toBe(formDefV1Id);
		expect(result?.data).toBeNull();
	});

	it("prefers existing saved data over a newer form definition without data", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		const [{ id: formDefV1Id }] = await db
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
			formDefinitionId: formDefV1Id,
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

		// Save data against the older form def (v1) only
		await db
			.insert(formDataVersions)
			.values({
				workflowInstanceId: instanceId,
				formDefId: formDefV1Id,
				version: 1,
				data: { firstName: "Alice" },
				patch: [],
				createdBy: "test",
				createdAt: new Date("2025-01-01T00:00:00.000Z"),
			})
			.returning();

		const [{ id: formDefV2Id }] = await db
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
			formDefinitionId: formDefV2Id,
			createdBy: "system",
			updatedBy: "system",
		});

		const result =
			await DB.formDataVersion.queries.getCurrentFormDataForWorkflowInstance(
				instanceId,
				"form1",
			);

		expect(result?.formDefinitionId).toBe(formDefV1Id);
		expect(result?.formDefinitionId).not.toBe(formDefV2Id);
		expect(result?.data).toEqual({ firstName: "Alice" });
		expect(result?.createdAt && new Date(result.createdAt).toISOString()).toBe(
			new Date("2025-01-01T00:00:00.000Z").toISOString(),
		);
	});

	it("breaks ties on equal createdAt deterministically (by data version or formDef version)", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();
		const [{ id: v1 }, { id: v2 }] = await db
			.insert(formDefinitions)
			.values([
				{
					state: "form1",
					version: 1,
					schema: formSchemaV1,
					createdBy: "system",
				},
				{
					state: "form1",
					version: 2,
					schema: formSchemaV2,
					createdBy: "system",
				},
			])
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
		const [{ id: instanceId }] = await db
			.insert(workflowInstances)
			.values({
				workflowDefId,
				currentState: "form1",
				createdBy: "system",
				updatedBy: "system",
			})
			.returning();

		const ts = new Date("2025-02-01T00:00:00.000Z");
		await db.insert(formDataVersions).values([
			{
				workflowInstanceId: instanceId,
				formDefId: v1,
				version: 2,
				data: { firstName: "X" },
				patch: [],
				createdBy: "test",
				createdAt: ts,
			},
			{
				workflowInstanceId: instanceId,
				formDefId: v2,
				version: 1,
				data: { firstName: "Y" },
				patch: [],
				createdBy: "test",
				createdAt: ts,
			},
		]);

		const r =
			await DB.formDataVersion.queries.getCurrentFormDataForWorkflowInstance(
				instanceId,
				"form1",
			);
		// Tiebreaker: createdAt equal -> prefer higher data version (desc), then formDef version (desc).
		expect(r?.formDefinitionId).toBe(v1);
		expect(r?.data).toEqual({ firstName: "X" });
	});

	it("among multiple saved rows across form definitions, picks the most recently saved data version", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		const [{ id: formDefV1Id }] = await db
			.insert(formDefinitions)
			.values({
				state: "form1",
				version: 1,
				schema: formSchemaV1,
				createdBy: "system",
			})
			.returning();

		const [{ id: formDefV2Id }] = await db
			.insert(formDefinitions)
			.values({
				state: "form1",
				version: 2,
				schema: formSchemaV2,
				createdBy: "system",
			})
			.returning();

		await db.insert(workflowDefinitionsFormDefinitionsMap).values([
			{
				workflowDefinitionId: workflowDefId,
				formDefinitionId: formDefV1Id,
				createdBy: "system",
				updatedBy: "system",
			},
			{
				workflowDefinitionId: workflowDefId,
				formDefinitionId: formDefV2Id,
				createdBy: "system",
				updatedBy: "system",
			},
		]);

		const [{ id: instanceId }] = await db
			.insert(workflowInstances)
			.values({
				workflowDefId,
				currentState: "form1",
				createdBy: "system",
				updatedBy: "system",
			})
			.returning();

		// Older formDef: two saves (version 1 then 2), but older createdAts
		await db.insert(formDataVersions).values({
			workflowInstanceId: instanceId,
			formDefId: formDefV1Id,
			version: 1,
			data: { firstName: "Old-1" },
			patch: [],
			createdBy: "test",
			createdAt: new Date("2025-01-01T00:00:00.000Z"),
		});
		await db.insert(formDataVersions).values({
			workflowInstanceId: instanceId,
			formDefId: formDefV1Id,
			version: 2,
			data: { firstName: "Old-2" },
			patch: [],
			createdBy: "test",
			createdAt: new Date("2025-01-02T00:00:00.000Z"),
		});

		// Newer formDef: one save, but most recent createdAt overall
		await db.insert(formDataVersions).values({
			workflowInstanceId: instanceId,
			formDefId: formDefV2Id,
			version: 1,
			data: { firstName: "New-1" },
			patch: [],
			createdBy: "test",
			createdAt: new Date("2025-01-03T00:00:00.000Z"),
		});

		const result =
			await DB.formDataVersion.queries.getCurrentFormDataForWorkflowInstance(
				instanceId,
				"form1",
			);

		// Expect the most recently saved data row to win, regardless of per-formDef revision number
		expect(result?.formDefinitionId).toBe(formDefV2Id);
		expect(result?.data).toEqual({ firstName: "New-1" });
	});

	it("uses current workflow instance state when state param is omitted", async () => {
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
				state: "form2",
				version: 2,
				schema: formSchemaV2,
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

		const workflowDefMap = await db
			.select()
			.from(workflowDefinitionsFormDefinitionsMap);

		console.log("workflowdefmap", workflowDefMap);

		const [{ id: instanceId }] = await db
			.insert(workflowInstances)
			.values({
				workflowDefId,
				currentState: "form2",
				createdBy: "system",
				updatedBy: "system",
			})
			.returning();

		const result =
			await DB.formDataVersion.queries.getCurrentFormDataForWorkflowInstance(
				instanceId,
			);

		expect(result?.formDefinitionId).toBe(v2);
	});

	it("throws when provided state is invalid for this workflow", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		// Only create form for form1; provided state will be invalid
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

		const [{ id: instanceId }] = await db
			.insert(workflowInstances)
			.values({
				workflowDefId,
				currentState: "form1",
				createdBy: "system",
				updatedBy: "system",
			})
			.returning();

		await expect(
			DB.formDataVersion.queries.getCurrentFormDataForWorkflowInstance(
				instanceId,
				"bad",
			),
		).rejects.toThrow(/No schema found for this state bad/);
	});

	it("throws when workflow instance does not exist", async () => {
		await expect(
			DB.formDataVersion.queries.getCurrentFormDataForWorkflowInstance(
				9999,
				"form1",
			),
		).rejects.toThrow(/No Workflow Instance found/);
	});

	it("getFormDataVersions: returns empty then sorts by createdAt desc", async () => {
		const empty = await DB.formDataVersion.queries.getFormDataVersions();
		expect(empty).toEqual([]);

		// Seed minimal WF + defs + instance
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
			formDefId,
			version: 1,
			data: { firstName: "A" },
			patch: [],
			createdBy: "test",
			createdAt: new Date("2025-01-01T00:00:00.000Z"),
		});
		await db.insert(formDataVersions).values({
			workflowInstanceId: instanceId,
			formDefId,
			version: 2,
			data: { firstName: "B" },
			patch: [],
			createdBy: "test",
			createdAt: new Date("2025-01-02T00:00:00.000Z"),
		});

		const rows = await DB.formDataVersion.queries.getFormDataVersions();
		expect(rows).toHaveLength(2);
		expect(new Date(rows[0].createdAt).toISOString()).toBe(
			new Date("2025-01-02T00:00:00.000Z").toISOString(),
		);
	});

	it("saveFormData: v1 empty patch, v2 has patch; per-formDef versioning", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();
		const [{ id: formDefId1 }] = await db
			.insert(formDefinitions)
			.values({
				state: "form1",
				version: 1,
				schema: formSchemaV1,
				createdBy: "system",
			})
			.returning();
		const [{ id: formDefId2 }] = await db
			.insert(formDefinitions)
			.values({
				state: "form1",
				version: 2,
				schema: formSchemaV2,
				createdBy: "system",
			})
			.returning();

		await db.insert(workflowDefinitionsFormDefinitionsMap).values([
			{
				workflowDefinitionId: workflowDefId,
				formDefinitionId: formDefId1,
				createdBy: "system",
				updatedBy: "system",
			},
			{
				workflowDefinitionId: workflowDefId,
				formDefinitionId: formDefId2,
				createdBy: "system",
				updatedBy: "system",
			},
		]);
		const [{ id: instanceId }] = await db
			.insert(workflowInstances)
			.values({
				workflowDefId,
				currentState: "form1",
				createdBy: "system",
				updatedBy: "system",
			})
			.returning();

		const first = await DB.formDataVersion.mutations.saveFormData(
			instanceId,
			formDefId1,
			{ firstName: "Alice" },
		);
		expect(first.version).toBe(1);
		expect(first.patch).toEqual([]);
		expect(first.data).toEqual({ firstName: "Alice" });

		const second = await DB.formDataVersion.mutations.saveFormData(
			instanceId,
			formDefId1,
			{ firstName: "Bob" },
		);
		expect(second.version).toBe(2);
		expect(Array.isArray(second.patch)).toBe(true);
		expect(second.patch.length).toBeGreaterThan(0);
		expect(
			second.patch.some(
				(op: Operation) => op.op === "replace" && op.path === "/firstName",
			),
		).toBe(true);
		expect(second.data).toEqual({ firstName: "Bob" });

		const third = await DB.formDataVersion.mutations.saveFormData(
			instanceId,
			formDefId2,
			{ firstName: "Carol" },
		);
		expect(third.version).toBe(1);
		expect(third.data).toEqual({ firstName: "Carol" });
	});

	it("saveFormData: schema validation enforces pattern even in partial mode", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();
		const emailSchema: FormSchema = {
			title: "Email",
			fields: [
				{
					name: "email",
					type: "text",
					label: "Email",
					required: true,
					pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
				},
			],
		};
		const [{ id: formDefId }] = await db
			.insert(formDefinitions)
			.values({
				state: "form1",
				version: 1,
				schema: emailSchema,
				createdBy: "system",
			})
			.returning();
		await db.insert(workflowDefinitionsFormDefinitionsMap).values({
			workflowDefinitionId: workflowDefId,
			formDefinitionId: formDefId,
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

		await expect(
			DB.formDataVersion.mutations.saveFormData(instanceId, formDefId, {
				email: "not-an-email",
			}),
		).rejects.toThrow(/has invalid format/);

		const ok = await DB.formDataVersion.mutations.saveFormData(
			instanceId,
			formDefId,
			{ email: "a@b.com" },
		);
		expect(ok.version).toBe(1);
		expect(ok.data).toEqual({ email: "a@b.com" });
	});

	it("throws when provided state is past the current state in workflow", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		const [{ id: formDefId1 }] = await db
			.insert(formDefinitions)
			.values({
				state: "form1",
				version: 1,
				schema: formSchemaV1,
				createdBy: "system",
			})
			.returning();
		const [{ id: formDefId2 }] = await db
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
				formDefinitionId: formDefId1,
				createdBy: "system",
				updatedBy: "system",
			},
			{
				workflowDefinitionId: workflowDefId,
				formDefinitionId: formDefId2,
				createdBy: "system",
				updatedBy: "system",
			},
		]);

		const [{ id: instanceId }] = await db
			.insert(workflowInstances)
			.values({
				workflowDefId,
				currentState: "form1",
				createdBy: "system",
				updatedBy: "system",
			})
			.returning();

		await expect(
			DB.formDataVersion.queries.getCurrentFormDataForWorkflowInstance(
				instanceId,
				"form2",
			),
		).rejects.toThrow(/past the current state/);
	});

	it("throws when provided state exists in workflow but has no form definition", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		// Only create definition for form1; omit form2 on purpose
		const [{ id: formDefId1 }] = await db
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
			formDefinitionId: formDefId1,
			createdBy: "system",
			updatedBy: "system",
		});

		// Set instance currentState to form2 so provided state isn't past current
		const [{ id: instanceId }] = await db
			.insert(workflowInstances)
			.values({
				workflowDefId,
				currentState: "form2",
				createdBy: "system",
				updatedBy: "system",
			})
			.returning();

		await expect(
			DB.formDataVersion.queries.getCurrentFormDataForWorkflowInstance(
				instanceId,
				"form2",
			),
		).rejects.toThrow(/No schema found for this state form2/);
	});

	it("saveFormData: produces a JSON patch showing changes", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();
		const [{ id: formDefId }] = await db
			.insert(formDefinitions)
			.values({
				state: "form1",
				version: 1,
				schema: formSchemaV2,
				createdBy: "system",
			})
			.returning();
		await db.insert(workflowDefinitionsFormDefinitionsMap).values({
			workflowDefinitionId: workflowDefId,
			formDefinitionId: formDefId,
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

		const first = await DB.formDataVersion.mutations.saveFormData(
			instanceId,
			formDefId,
			{ firstName: "Alice", lastName: "A" },
		);
		expect(first.version).toBe(1);
		expect(first.patch).toEqual([]);

		const second = await DB.formDataVersion.mutations.saveFormData(
			instanceId,
			formDefId,
			{ firstName: "Bob", lastName: "A" },
		);
		expect(second.version).toBe(2);
		expect(second.patch).toEqual([
			{ op: "replace", path: "/firstName", value: "Bob" },
		]);
	});

	it("saveFormData: returns existing data without creating new version when data is identical", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		const [{ id: formDefId }] = await db
			.insert(formDefinitions)
			.values({
				state: "form1",
				version: 1,
				schema: formSchemaV2,
				createdBy: "system",
			})
			.returning();

		await db.insert(workflowDefinitionsFormDefinitionsMap).values({
			workflowDefinitionId: workflowDefId,
			formDefinitionId: formDefId,
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

		// Save initial data
		const first = await DB.formDataVersion.mutations.saveFormData(
			instanceId,
			formDefId,
			{ firstName: "Alice", lastName: "Smith" },
		);
		expect(first.version).toBe(1);
		expect(first.patch).toEqual([]);
		expect(first.data).toEqual({ firstName: "Alice", lastName: "Smith" });

		// Attempt to save identical data - should return existing record without creating new version
		const second = await DB.formDataVersion.mutations.saveFormData(
			instanceId,
			formDefId,
			{ firstName: "Alice", lastName: "Smith" },
		);

		// Should return the same record (same version, same data)
		expect(second.version).toBe(1); // No version increment
		expect(second.data).toEqual({ firstName: "Alice", lastName: "Smith" });
		expect(second.id).toBe(first.id); // Same record ID

		// Verify no new record was created in the database
		const allVersions = await db
			.select()
			.from(formDataVersions)
			.where(
				and(
					eq(formDataVersions.workflowInstanceId, instanceId),
					eq(formDataVersions.formDefId, formDefId),
				),
			);
		expect(allVersions).toHaveLength(1); // Still only one record
	});
});
