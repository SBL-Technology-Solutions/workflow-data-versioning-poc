import { FormState, onSubmitAction } from "@/app/actions/onSubmitAction";
import { createDataVersion } from "@/app/actions/WorkflowVersioningActions";
import { getCurrentForm } from "@/lib/queries/getCurrentForm";
import { getLatestCurrentFormData } from "@/lib/queries/getLatestCurrentFormData";
import { getWorkflowInstance } from "@/lib/queries/getWorkflowInstance";
import { DynamicForm } from "@/components/DynamicForm";
import Link from "next/link";

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
          workflowInstanceId={workflowInstanceId}
          formDefId={currentForm.formId}
        />
      )}
    </div>
  );
};

export default WorkflowPage;