CREATE TABLE "workflow_form_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_def_id" serial NOT NULL,
	"form_def_id" serial NOT NULL,
	"state" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_definitions" DROP CONSTRAINT "form_definitions_workflow_def_id_workflow_definitions_id_fk";
--> statement-breakpoint
ALTER TABLE "workflow_definitions" ALTER COLUMN "machine_config" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_definitions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "workflow_form_definitions" ADD CONSTRAINT "workflow_form_definitions_workflow_def_id_workflow_definitions_id_fk" FOREIGN KEY ("workflow_def_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_form_definitions" ADD CONSTRAINT "workflow_form_definitions_form_def_id_form_definitions_id_fk" FOREIGN KEY ("form_def_id") REFERENCES "public"."form_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_definitions" DROP COLUMN "workflow_def_id";--> statement-breakpoint
ALTER TABLE "form_definitions" DROP COLUMN "state";