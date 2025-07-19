import { desc } from "drizzle-orm";
import { getDbClient } from "@/db/client";
import { formDataVersions } from "@/db/schema";

const dbClient = getDbClient();

/**
 * Retrieves the latest form data version records from the database, ordered by creation date descending.
 *
 * @returns A promise resolving to an array of the most recent form data version entries.
 */
export async function getFormDataVersions() {
	return await dbClient
		.select()
		.from(formDataVersions)
		.orderBy(desc(formDataVersions.createdAt));
}

export const formDataVersion = {
	queries: {
		getFormDataVersions,
	},
};
