import { formDataVersions } from "@/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { desc } from "drizzle-orm";

export async function getFormDataVersions() {
	const { db } = await import("../db");
	return await db.query.formDataVersions.findMany({
		orderBy: desc(formDataVersions.createdAt),
		limit: 5,
	});
}

export const fetchFormDataVersions = createServerFn({
	method: "GET",
}).handler(async () => {
	console.info("Fetching form data versions");
	return getFormDataVersions();
});

export const formDataVersionsQueryOptions = () => ({
	queryKey: ["formDataVersions", { limit: 5 }],
	queryFn: () => fetchFormDataVersions(),
});
