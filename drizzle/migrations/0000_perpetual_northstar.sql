CREATE TABLE IF NOT EXISTS "form_data_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_instance_id" uuid,
	"form_def_id" integer,
	"version" integer NOT NULL,
	"data" jsonb NOT NULL,
	"patch" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "form_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_def_id" integer,
	"state" text NOT NULL,
	"version" integer NOT NULL,
	"schema" jsonb NOT NULL,
	"ui_schema" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" integer NOT NULL,
	"machine_config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_def_id" integer,
	"current_state" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "form_data_versions" ADD CONSTRAINT "form_data_versions_workflow_instance_id_workflow_instances_id_fk" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "form_data_versions" ADD CONSTRAINT "form_data_versions_form_def_id_form_definitions_id_fk" FOREIGN KEY ("form_def_id") REFERENCES "form_definitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "form_definitions" ADD CONSTRAINT "form_definitions_workflow_def_id_workflow_definitions_id_fk" FOREIGN KEY ("workflow_def_id") REFERENCES "workflow_definitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_workflow_def_id_workflow_definitions_id_fk" FOREIGN KEY ("workflow_def_id") REFERENCES "workflow_definitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
