import { useSuspenseQuery } from "@tanstack/react-query";
import { API } from "@/data/API";

export function FormDefinitions() {
	const formDefinitionsQuery = useSuspenseQuery(
		API.formDefinition.queries.getFormDefinitionsQueryOptions(),
	);

	return (
		<section className="mb-8">
			<h2 className="text-xl font-semibold mb-4">Recent Form Definitions</h2>
			{formDefinitionsQuery.data.map((form) => (
				<div key={form.id} className="mb-4 p-4 border rounded">
					<div>ID: {form.id}</div>
					<div>State: {form.state}</div>
					<div>Version: {form.version}</div>
					<div>
						Schema:{" "}
						<pre className="text-sm bg-secondary text-secondary-foreground p-2 mt-2 rounded">
							{JSON.stringify(form.schema, null, 2)}
						</pre>
					</div>
				</div>
			))}
		</section>
	);
}
