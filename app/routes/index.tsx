import * as fs from "node:fs";
import { Button } from "@/components/ui/button";
import { getAllWorkflowInstances } from "@/domains/workflowInstances";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const filePath = "count.txt";

async function readCount() {
	return Number.parseInt(
		await fs.promises.readFile(filePath, "utf-8").catch(() => "0"),
	);
}

const getWorkflowInstances = createServerFn({
	method: "GET",
}).handler(async () => {
	return getAllWorkflowInstances();
});

const getCount = createServerFn({
	method: "GET",
}).handler(() => {
	return readCount();
});

const updateCount = createServerFn({ method: "POST" })
	.validator((d: number) => d)
	.handler(async ({ data }) => {
		console.log("updateCount", data);
		const count = await readCount();
		await fs.promises.writeFile(filePath, `${count + data}`);
	});

export const Route = createFileRoute("/")({
	component: Home,
	loader: async () => {
		const [state, instances] = await Promise.all([
			getCount(),
			getWorkflowInstances(),
		]);
		return { state, instances };
	},
});

function Home() {
	const router = useRouter();
	const { state, instances } = Route.useLoaderData();

	return (
		<>
			<Button
				className="cursor-pointer"
				onClick={() => {
					updateCount({ data: 1 }).then(() => {
						router.invalidate();
					});
				}}
			>
				Add 1 to {state}?
			</Button>
			<pre>{JSON.stringify(instances, null, 2)}</pre>
		</>
	);
}
