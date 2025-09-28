import formDataVersionCollection from "@/data/Collections/formDataVersionCollection";
import { useLiveQuery } from "@tanstack/react-db";

export function FormDataVersions() {
	const { data: formDataVersions } = useLiveQuery((q) =>
		q.from({ formDataVersion: formDataVersionCollection }),
	);

	return (
		<section className="mb-8">
			<h2 className="text-xl font-semibold mb-4">Recent Form Data Versions</h2>
			{formDataVersions.map((data) => (
				<div key={data.id} className="mb-4 p-4 border rounded-lg">
					<div>ID: {data.id}</div>
					<div>Version: {data.version}</div>
					<div>Created By: {data.createdBy}</div>
					<div>
						Data:{" "}
						<pre className="text-sm bg-accent text-accent-foreground p-2 mt-2 rounded-lg">
							{JSON.stringify(data.data, null, 2)}
						</pre>
					</div>
					<div>
						Patch:{" "}
						<pre className="text-sm bg-accent text-accent-foreground p-2 mt-2 rounded-lg">
							{JSON.stringify(data.patch, null, 2)}
						</pre>
					</div>
				</div>
			))}
		</section>
	);
}
