import { formDataVersionsQueryOptions } from "@/data/formDataVersions";
import { useSuspenseQuery } from "@tanstack/react-query";

export function FormDataVersions() {
	const formData = useSuspenseQuery(formDataVersionsQueryOptions());

	return (
		<section className="mb-8">
			<h2 className="text-xl font-semibold mb-4">Recent Form Data Versions</h2>
			{formData.data.map((data) => (
				<div key={data.id} className="mb-4 p-4 border rounded">
					<div>ID: {data.id}</div>
					<div>Version: {data.version}</div>
					<div>Created By: {data.createdBy}</div>
					<div>
						Data:{" "}
						<pre className="text-sm bg-secondary text-secondary-foreground p-2 mt-2 rounded">
							{JSON.stringify(data.data, null, 2)}
						</pre>
					</div>
					<div>
						Patch:{" "}
						<pre className="text-sm bg-secondary text-secondary-foreground p-2 mt-2 rounded">
							{JSON.stringify(data.patch, null, 2)}
						</pre>
					</div>
				</div>
			))}
		</section>
	);
}
