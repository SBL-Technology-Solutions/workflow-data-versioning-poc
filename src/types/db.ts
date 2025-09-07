import { dbClient } from "@/db/client";

export type DbTransaction = Parameters<
	Parameters<typeof dbClient.transaction>[0]
>[0];
export type DbClient = typeof dbClient;
