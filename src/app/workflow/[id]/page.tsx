import {
  createDataVersion,
  getCurrentForm,
  getWorkflowInstance,
} from "@/app/server/actions/WorkflowVersioningActions";
import { DynamicForm } from "@/components/DynamicForm";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function submitFormAction(
  workflowInstanceId: string,
  formId: string | null,
  data: any
) {
  "use server";

  if (!formId) {
    throw new Error("Form ID is required");
  }

  try {
    await createDataVersion(workflowInstanceId, formId, data);

    revalidatePath(`/workflow/${workflowInstanceId}`);
  } catch (error) {
    console.error("Error submitting form:", error);
    throw new Error("Failed to submit form");
  }
}

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Load workflow and form data on the server
  const { id } = await params;
  console.log("id", id);
  const workflow = await getWorkflowInstance(id);
  console.log("workflow", workflow);
  const currentState = workflow.currentState;
  console.log("currentState", currentState);
  const currentForm = await getCurrentForm(id, currentState);
  console.log("currentForm", currentForm);
  return (
    <div className="container mx-auto p-4">
      <Link href="/" className="text-blue-500 hover:underline mb-4 block">
        &larr; Back to Home
      </Link>

      <h1 className="text-2xl font-bold mb-4">Workflow Step: {currentState}</h1>

      {currentForm.schema && (
        <DynamicForm
          schema={currentForm.schema}
          //   onSubmit={async (data) => {
          //     await submitFormAction(id, currentForm.formId, data);
          //   }}
          //   onSubmit={(data) => {
          //     console.log("data", data);
          //   }}
        />
      )}
    </div>
  );
}
