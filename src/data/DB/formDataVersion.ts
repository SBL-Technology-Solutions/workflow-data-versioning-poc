import { and, desc, eq } from "drizzle-orm";
import { getDbClient } from "@/db/client";
import { formDataVersions } from "@/db/schema";

const dbClient = getDbClient();

/**
 * Retrieves the latest form data version records from the database, ordered by creation date descending.
 *
 * @returns A promise resolving to an array of the most recent form data version entries.
 */
const getFormDataVersions = async () => {
	return await dbClient
		.select()
		.from(formDataVersions)
		.orderBy(desc(formDataVersions.createdAt));
};

/**
 * Retrieves the most recent form data version for the specified workflow instance and form definition.
 *
 * @param workflowInstanceId - The ID of the workflow instance to filter by
 * @param formDefId - The ID of the form definition to filter by
 * @returns An array containing the latest form data version record, or an empty array if none exist
 */
const getLatestCurrentFormData = async (
	workflowInstanceId: number,
	formDefId: number,
) => {
	const result = await dbClient
		.select({
			id: formDataVersions.id,
			version: formDataVersions.version,
			data: formDataVersions.data,
			patch: formDataVersions.patch,
			createdAt: formDataVersions.createdAt,
			createdBy: formDataVersions.createdBy,
		})
		.from(formDataVersions)
		.where(
			and(
				eq(formDataVersions.workflowInstanceId, workflowInstanceId),
				eq(formDataVersions.formDefId, formDefId),
			),
		)
		.orderBy(desc(formDataVersions.version))
		.limit(1);

	return result;
};

export const formDataVersion = {
	queries: {
		getFormDataVersions,
		getLatestCurrentFormData,
	},
};
