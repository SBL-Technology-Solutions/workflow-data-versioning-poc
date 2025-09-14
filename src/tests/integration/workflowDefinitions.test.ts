import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { workflowDefinitions } from "@/db/schema";
import {
	cleanupTestDb,
	setupTestDb,
	type TestDbContext,
	truncateAllTables,
} from "./testDb";

describe("DB.workflowDefinition", () => {
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

	it("getWorkflowDefinitions: returns empty then sorts by createdAt desc", async () => {
		const empty = await DB.workflowDefinition.queries.getWorkflowDefinitions();
		expect(empty).toEqual([]);

		await db.insert(workflowDefinitions).values({
			name: "WF A",
			version: 1,
			machineConfig,
			createdAt: new Date("2025-01-01T00:00:00.000Z"),
			createdBy: "system",
		});
		await db.insert(workflowDefinitions).values({
			name: "WF B",
			version: 2,
			machineConfig,
			createdAt: new Date("2025-01-02T00:00:00.000Z"),
			createdBy: "system",
		});

		const rows = await DB.workflowDefinition.queries.getWorkflowDefinitions();
		expect(rows).toHaveLength(2);
		expect(new Date(rows[0].createdAt).toISOString()).toBe(
			new Date("2025-01-02T00:00:00.000Z").toISOString(),
		);
	});

	it("getWorkflowDefinition: returns a workflow by id with states", async () => {
		const [{ id }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig, createdBy: "system" })
			.returning();

		const wf = await DB.workflowDefinition.queries.getWorkflowDefinition(id);
		expect(wf.id).toBe(id);
		expect(wf.name).toBe("WF");
		expect(wf.version).toBe(1);
		expect(wf.machineConfig).toEqual(machineConfig);
		expect(Array.isArray(wf.states)).toBe(true);
		expect(wf.states).toEqual(["form1", "form2"]);
	});

	it("getWorkflowDefinition: throws for missing id", async () => {
		await expect(
			DB.workflowDefinition.queries.getWorkflowDefinition(9999),
		).rejects.toThrow(/Workflow not found/);
	});
});
