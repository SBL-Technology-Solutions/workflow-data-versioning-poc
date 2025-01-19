import { db } from "@/app/server/db";
import {
  formDataVersions,
  formDefinitions,
  workflowDefinitions,
  workflowInstances,
} from "@/app/server/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";

export default async function Home() {
  // Fetch some recent data from each table
  const workflows = await db.query.workflowDefinitions.findMany({
    orderBy: desc(workflowDefinitions.createdAt),
    limit: 5,
  });

  const instances = await db.query.workflowInstances.findMany({
    orderBy: desc(workflowInstances.createdAt),
    limit: 5,
  });

  const forms = await db.query.formDefinitions.findMany({
    orderBy: desc(formDefinitions.createdAt),
    limit: 5,
  });

  const formData = await db.query.formDataVersions.findMany({
    orderBy: desc(formDataVersions.createdAt),
    limit: 5,
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">Database Status</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Recent Workflow Definitions
        </h2>
        {workflows.map((wf) => (
          <div key={wf.id} className="mb-4 p-4 border rounded">
            <div>ID: {wf.id}</div>
            <div>Name: {wf.name}</div>
            <div>Version: {wf.version}</div>
            <div>
              Machine Config:{" "}
              <pre className="text-sm bg-gray-50 p-2 mt-2">
                {JSON.stringify(wf.machineConfig, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Recent Workflow Instances
        </h2>
        {instances.map((instance) => (
          <div key={instance.id} className="mb-4 p-4 border rounded">
            <div>
              ID:{" "}
              <Link
                href={`/workflow/${instance.id}`}
                className="text-blue-500 hover:underline"
              >
                {instance.id}
              </Link>
            </div>
            <div>Current State: {instance.currentState}</div>
            <div>Status: {instance.status}</div>
            <div>Workflow Definition ID: {instance.workflowDefId}</div>
          </div>
        ))}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Form Definitions</h2>
        {forms.map((form) => (
          <div key={form.id} className="mb-4 p-4 border rounded">
            <div>ID: {form.id}</div>
            <div>State: {form.state}</div>
            <div>Version: {form.version}</div>
            <div>
              Schema:{" "}
              <pre className="text-sm bg-gray-50 p-2 mt-2">
                {JSON.stringify(form.schema, null, 2)}
              </pre>
            </div>
            <div>
              UI Schema:{" "}
              <pre className="text-sm bg-gray-50 p-2 mt-2">
                {JSON.stringify(form.uiSchema, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Recent Form Data Versions
        </h2>
        {formData.map((data) => (
          <div key={data.id} className="mb-4 p-4 border rounded">
            <div>ID: {data.id}</div>
            <div>Version: {data.version}</div>
            <div>Created By: {data.createdBy}</div>
            <div>
              Data:{" "}
              <pre className="text-sm bg-gray-50 p-2 mt-2">
                {JSON.stringify(data.data, null, 2)}
              </pre>
            </div>
            <div>
              Patch:{" "}
              <pre className="text-sm bg-gray-50 p-2 mt-2">
                {JSON.stringify(data.patch, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
