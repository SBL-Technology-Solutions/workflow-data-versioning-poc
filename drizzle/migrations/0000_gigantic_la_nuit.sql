CREATE TABLE "form_data_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_instance_id" serial NOT NULL,
	"form_def_id" serial NOT NULL,
	"version" integer NOT NULL,
	"data" jsonb NOT NULL,
	"patch" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_def_id" serial NOT NULL,
	"state" varchar NOT NULL,
	"version" integer NOT NULL,
	"schema" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"version" integer NOT NULL,
	"machine_config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_def_id" serial NOT NULL,
	"current_state" varchar NOT NULL,
	"status" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_data_versions" ADD CONSTRAINT "form_data_versions_workflow_instance_id_workflow_instances_id_fk" FOREIGN KEY ("workflow_instance_id") REFERENCES "public"."workflow_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_data_versions" ADD CONSTRAINT "form_data_versions_form_def_id_form_definitions_id_fk" FOREIGN KEY ("form_def_id") REFERENCES "public"."form_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_definitions" ADD CONSTRAINT "form_definitions_workflow_def_id_workflow_definitions_id_fk" FOREIGN KEY ("workflow_def_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_workflow_def_id_workflow_definitions_id_fk" FOREIGN KEY ("workflow_def_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE no action ON UPDATE no action;