import { useLiveQuery } from "@tanstack/react-db";
import formDefinitionCollection from "@/data/collection/formDefinition";

export function FormDefinitions() {
	const { data: formDefinitions } = useLiveQuery((q) =>
		q.from({ formDefinition: formDefinitionCollection }),
	);

	return (
		<section className="mb-8">
			<h2 className="text-xl font-semibold mb-4">Recent Form Definitions</h2>
			{formDefinitions.map((form) => (
				<div key={form.id} className="mb-4 p-4 border rounded-lg">
					<div>ID: {form.id}</div>
					<div>State: {form.state}</div>
					<div>Version: {form.version}</div>
					<div>
						Schema:{" "}
						<pre className="text-sm bg-accent text-accent-foreground p-2 mt-2 rounded-lg">
							{JSON.stringify(form.schema, null, 2)}
						</pre>
					</div>
				</div>
			))}
		</section>
	);
}
