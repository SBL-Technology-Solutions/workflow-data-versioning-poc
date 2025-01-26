import { FormState, onSubmitAction } from "@/app/server/actions/onSubmitAction";
import { createDataVersion } from "@/app/server/actions/WorkflowVersioningActions";
import { getCurrentForm } from "@/app/server/queries/getCurrentForm";
import { getLatestCurrentFormData } from "@/app/server/queries/getLatestCurrentFormData";
import { getWorkflowInstance } from "@/app/server/queries/getWorkflowInstance";
import { DynamicForm } from "@/components/DynamicForm";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function submitFormAction(
  data: Record<string, any>,
  workflowInstanceId: number,
  formId: number
) {
  "use server";

  await createDataVersion(workflowInstanceId, formId, data);
  revalidatePath(`/workflow/${workflowInstanceId}`);
}

const WorkflowPage = async ({ params }: { params: { id: string } }) => {
  const { id } = await params;
  const workflowInstanceId = parseInt(id);
  const workflow = await getWorkflowInstance(workflowInstanceId);
  if (!workflow) {
    return <div>No workflow found</div>;
  }

  console.log("workflow: ", workflow);
  const currentForm = await getCurrentForm(
    workflowInstanceId,
    workflow.currentState
  );

  if (!currentForm.formId) {
    return <div>No form found</div>;
  }

  console.log("currentForm: ", currentForm);

  const latestFormData = await getLatestCurrentFormData(
    workflowInstanceId,
    currentForm.formId
  );

  console.log("latestFormData: ", latestFormData);

  const handleSubmit = async (prevState: FormState, formData: FormData) => {
    "use server";
    return onSubmitAction(
      prevState,
      formData,
      currentForm.schema!,
      true,
      submitFormAction,
      workflowInstanceId,
      currentForm.formId
    );
  };

  return (
    <div className="container mx-auto p-4">
      <Link href="/" className="text-blue-500 hover:underline mb-4 block">
        &larr; Back to Home
      </Link>

      <h1 className="text-2xl font-bold mb-4">
        Workflow Step: {workflow.currentState}
      </h1>

      {currentForm.schema && (
        <DynamicForm
          schema={currentForm.schema}
          initialData={latestFormData[0]?.data}
          action={handleSubmit}
        />
      )}
    </div>
  );
};

export default WorkflowPage;
