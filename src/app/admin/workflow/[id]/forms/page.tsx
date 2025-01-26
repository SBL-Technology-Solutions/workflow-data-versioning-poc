import { getCurrentFormDefinition } from "@/app/server/queries/getCurrentFormDefinition";
import { getWorkflowDefinition } from "@/app/server/queries/getWorkflowDefinition";
import { FormBuilder } from "@/components/admin/FormBuilder";
// import { stateSearchParamsLoader } from "@/components/admin/StateSearchParams";
import { FormState, onSubmitAction } from "@/app/server/actions/onSubmitAction";
import { createFormVersion } from "@/app/server/actions/WorkflowVersioningActions";
import { StateSelector } from "@/components/admin/StateSelector";
import { FormSchema } from "@/lib/types/form";
import Link from "next/link";
import { SearchParams } from "nuqs/server";
import { loadSearchParams } from "./searchParams";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
  searchParams: Promise<SearchParams>;
};

export async function createFormVersionWrapper(
  data: Record<string, any>,
  workflowDefId: number,
  state: string
) {
  "use server";
  console.log("data in createFormVersionWrapper", data);
  await createFormVersion(data as FormSchema, workflowDefId, state);
  // revalidatePath(`/admin/workflow/${workflowDefId}/forms`);
}

export default async function WorkflowFormAdminPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { state } = await loadSearchParams(searchParams);
  console.log("state", state);

  const workflowId = parseInt(id);
  const workflow = await getWorkflowDefinition(workflowId);

  if (!workflow) {
    return <div>Workflow not found</div>;
  }

  const states = Object.keys(workflow.machineConfig.states);
  const currentState = state || states[0];
  console.log("currentState", currentState);

  const currentForm = await getCurrentFormDefinition(workflowId, currentState);
  console.log("currentForm", currentForm);

  const handleSubmitCreateFormVersion = async (
    prevState: FormState,
    formData: FormData
  ) => {
    "use server";
    // console.log("formData in handleSubmitCreateFormVersion", formData);
    // const fields = JSON.parse(formData.get("fields") as string);
    // console.log("fields from formData", fields);
    // formData.set("fields", fields);
    return onSubmitAction(
      prevState,
      formData,
      currentForm?.schema,
      false,
      createFormVersionWrapper,
      workflowId,
      currentState
    );
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Edit Form: {workflow.name}</h1>
          <StateSelector states={states} defaultState={currentState} />
        </div>
        <Link
          href="/admin/workflows"
          className="text-blue-500 hover:text-blue-700"
        >
          Back to Workflows
        </Link>
      </div>

      <FormBuilder
        initialSchema={currentForm?.schema}
        workflowId={workflowId}
        state={currentState}
        key={currentForm?.id}
        action={handleSubmitCreateFormVersion}
      />
    </div>
  );
}
