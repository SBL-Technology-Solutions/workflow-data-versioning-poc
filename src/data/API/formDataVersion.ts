import { createServerFn } from "@tanstack/react-start";
import { DB } from "../DB";

const formDataVersionQueryKeys = {
	all: () => ["formDataVersions"] as const,
	lists: () => [...formDataVersionQueryKeys.all(), "list"] as const,
	list: () => [...formDataVersionQueryKeys.lists()] as const,
	details: () => [...formDataVersionQueryKeys.all(), "detail"] as const,
	detail: (id: number) => [...formDataVersionQueryKeys.details(), id] as const,
} as const;

export const getFormDataVersions = createServerFn({
	method: "GET",
}).handler(async () => {
	return DB.formDataVersion.queries.getFormDataVersions();
});

export const getFormDataVersionsQueryOptions = () => ({
	queryKey: formDataVersionQueryKeys.list(),
	queryFn: () => getFormDataVersions(),
});

export const formDataVersion = {
	queries: {
		getFormDataVersionsQueryOptions,
	},
};
