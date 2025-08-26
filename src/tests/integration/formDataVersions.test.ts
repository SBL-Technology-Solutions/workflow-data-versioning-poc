import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	formDataVersions,
	formDefinitions,
	workflowDefinitions,
	workflowInstances,
} from "@/db/schema";
import type { FormSchema } from "@/lib/form";

describe("DB.formDataVersion.getCurrentFormDataForWorkflowInstance", () => {
	const PG_IMAGE = "postgres:17.5";

	let container: StartedPostgreSqlContainer;
	let pool: Pool;
	let db: ReturnType<typeof drizzle>;

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
		container = await new PostgreSqlContainer(PG_IMAGE).start();

		const connectionString = container.getConnectionUri();

		// Ensure the app DB client points at this container
		process.env.DATABASE_URL = connectionString;

		// Create a dedicated pool + drizzle instance for migrations and seeding
		pool = new Pool({ connectionString });
		db = drizzle(pool);

		// Run migrations for this fresh DB
		await migrate(db, { migrationsFolder: "./drizzle/migrations" });
	});

	afterAll(async () => {
		// Need to close the pool which is used for the migrations above and the client which is used for the tests below separately
		await pool.end();
		const { dbClient } = await import("@/db/client");
		await dbClient.$client.end();
		await container.stop();
	});

	beforeEach(async () => {
		// Clean tables between tests; also reset identity counters for deterministic IDs
		await db.execute(
			sql`TRUNCATE TABLE form_data_versions, workflow_instances, form_definitions, workflow_definitions RESTART IDENTITY CASCADE`,
		);
	});

	it("returns latest form definition when no saved data exists for the instance/state", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig })
			.returning();

		const [{ id: formDefV1Id }] = await db
			.insert(formDefinitions)
			.values({
				workflowDefId: workflowDefId,
				state: "form1",
				version: 1,
				schema: formSchemaV1,
			})
			.returning();

		const [{ id: formDefV2Id }] = await db
			.insert(formDefinitions)
			.values({
				workflowDefId,
				state: "form1",
				version: 2,
				schema: formSchemaV2,
			})
			.returning();

		const [{ id: instanceId }] = await db
			.insert(workflowInstances)
			.values({ workflowDefId, currentState: "form1", status: "active" })
			.returning();

		const { DB } = await import("@/data/DB");

		const result =
			await DB.formDataVersion.queries.getCurrentFormDataForWorkflowInstance(
				instanceId,
				"form1",
			);

		expect(result?.formDefinitionId).toBe(formDefV2Id);
		expect(result?.formDefinitionId).not.toBe(formDefV1Id);
	});

	it("prefers existing saved data over a newer form definition without data", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig })
			.returning();

		const [{ id: formDefV1Id }] = await db
			.insert(formDefinitions)
			.values({
				workflowDefId,
				state: "form1",
				version: 1,
				schema: formSchemaV1,
			})
			.returning();
		const [{ id: instanceId }] = await db
			.insert(workflowInstances)
			.values({ workflowDefId, currentState: "form1", status: "active" })
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
				createdAt: new Date("2024-01-01T00:00:00.000Z"),
			})
			.returning();

		const [{ id: formDefV2Id }] = await db
			.insert(formDefinitions)
			.values({
				workflowDefId,
				state: "form1",
				version: 2,
				schema: formSchemaV2,
			})
			.returning();

		const { DB } = await import("@/data/DB");
		const result =
			await DB.formDataVersion.queries.getCurrentFormDataForWorkflowInstance(
				instanceId,
				"form1",
			);

		expect(result?.formDefinitionId).toBe(formDefV1Id);
		expect(result?.formDefinitionId).not.toBe(formDefV2Id);
		expect(result?.data).toEqual({ firstName: "Alice" });
	});

	it("among multiple saved rows across form definitions, picks the most recently saved data version", async () => {
		const [{ id: workflowDefId }] = await db
			.insert(workflowDefinitions)
			.values({ name: "WF", version: 1, machineConfig })
			.returning();

		const [{ id: formDefV1Id }] = await db
			.insert(formDefinitions)
			.values({
				workflowDefId,
				state: "form1",
				version: 1,
				schema: formSchemaV1,
			})
			.returning();

		const [{ id: formDefV2Id }] = await db
			.insert(formDefinitions)
			.values({
				workflowDefId,
				state: "form1",
				version: 2,
				schema: formSchemaV2,
			})
			.returning();

		const [{ id: instanceId }] = await db
			.insert(workflowInstances)
			.values({ workflowDefId, currentState: "form1", status: "active" })
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

		const { DB } = await import("@/data/DB");
		const result =
			await DB.formDataVersion.queries.getCurrentFormDataForWorkflowInstance(
				instanceId,
				"form1",
			);

		// Expect the most recently saved data row to win, regardless of per-formDef revision number
		expect(result?.formDefinitionId).toBe(formDefV2Id);
		expect(result?.data).toEqual({ firstName: "New-1" });
	});
});
