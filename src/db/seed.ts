import { db } from "@/db";
import {
  formDefinitions,
  workflowDefinitions,
  workflowInstances,
} from "@/db/schema";
import { FormSchema } from "@/lib/types/form";

async function seed() {
  try {
    // Create a workflow definition
    const [workflow] = await db
      .insert(workflowDefinitions)
      .values({
        name: "Sample Workflow",
        version: 1,
        machineConfig: {
          initial: "form1",
          states: {
            form1: {
              on: { NEXT: "form2" },
            },
            form2: {
              type: "final",
            },
          },
        },
      })
      .returning();

    // Create a form definition
    const formSchema = FormSchema.parse({
      title: "Personal Information",
      description: "Please fill out your personal information",
      fields: [
        {
          name: "firstName",
          type: "text",
          label: "First Name",
          required: true,
          minLength: 2,
          maxLength: 50,
        },
        {
          name: "lastName",
          type: "text",
          label: "Last Name",
          required: true,
          minLength: 2,
          maxLength: 50,
        },
        {
          name: "bio",
          type: "textarea",
          label: "Biography",
          description: "Tell us about yourself",
          required: false,
          rows: 4,
          maxLength: 500,
        },
      ],
    });

    await db.insert(formDefinitions).values({
      workflowDefId: workflow.id,
      state: "form1",
      version: 1,
      schema: formSchema,
    });

    // Create a sample workflow instance
    await db.insert(workflowInstances).values({
      workflowDefId: workflow.id,
      currentState: "form1",
      status: "active",
    });

    console.log("Seed data inserted successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    process.exit(0);
  }
}

seed().catch(console.error);
