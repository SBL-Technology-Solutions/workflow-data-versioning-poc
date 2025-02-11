import { getCurrentForm } from "@/lib/queries/getCurrentForm";
import { getLatestCurrentFormData } from "@/lib/queries/getLatestCurrentFormData";
import { getWorkflowInstance } from "@/lib/queries/getWorkflowInstance";
import { DynamicForm } from "@/components/DynamicForm";
import Link from "next/link";
import { getWorkflowDefinition } from "@/lib/queries/getWorkflowDefinition";

const WorkflowPage = async ({ params }: { params: { id: string } }) => {
  const { id } = await params;
  const workflowInstanceId = parseInt(id);
  const workflowInstance = await getWorkflowInstance(workflowInstanceId);
  
  if (!workflowInstance) {
    return <div>No workflow found</div>;
  }

  console.log("workflow: ", workflowInstance);
  const currentForm = await getCurrentForm(
    workflowInstanceId,
    workflowInstance.currentState
  );

  if (!currentForm.formDefId) {
    return <div>No form found</div>;
  }

  console.log("currentForm: ", currentForm);

  const latestFormData = await getLatestCurrentFormData(
    workflowInstanceId,
    currentForm.formDefId
  );

  console.log("latestFormData: ", latestFormData);

  const workflowDefinition = await getWorkflowDefinition(workflowInstance.workflowDefId);
  const machineConfig = {
    ...workflowDefinition.machineConfig,
    initial: workflowInstance.currentState, // Set the initial state to the current state
  };

  return (
    <div className="container mx-auto p-4">
      <Link href="/" className="text-blue-500 hover:underline mb-4 block">
        &larr; Back to Home
      </Link>

      <h1 className="text-2xl font-bold mb-4">
        Workflow Step: {workflowInstance.currentState}
      </h1>

      {currentForm.schema && (
        <DynamicForm
          key={currentForm.formDefId}
          schema={currentForm.schema}
          initialData={latestFormData[0]?.data}
          workflowInstanceId={workflowInstanceId}
          formDefId={currentForm.formDefId}
          machineConfig={machineConfig}
        />
      )}
    </div>
  );
};

export default WorkflowPage;