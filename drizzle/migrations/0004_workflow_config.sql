CREATE TABLE "workflow_definitions_form_definitions_map" (
	"workflow_definition_id" integer NOT NULL,
	"form_definition_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar NOT NULL,
	"updated_by" varchar NOT NULL,
	CONSTRAINT "wdfdm_pk" PRIMARY KEY("workflow_definition_id","form_definition_id")
);
--> statement-breakpoint
ALTER TABLE "form_definitions" DROP CONSTRAINT "form_definitions_workflow_def_id_workflow_definitions_id_fk";
--> statement-breakpoint
ALTER TABLE "form_data_versions" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "form_data_versions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE IF EXISTS form_data_versions_id_seq;--> statement-breakpoint
ALTER TABLE "form_data_versions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "form_data_versions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "form_definitions" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "form_definitions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE IF EXISTS form_definitions_id_seq;--> statement-breakpoint
ALTER TABLE "form_definitions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "form_definitions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "workflow_definitions" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "workflow_definitions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE IF EXISTS workflow_definitions_id_seq;--> statement-breakpoint
ALTER TABLE "workflow_definitions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "workflow_definitions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "workflow_instances" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "workflow_instances" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE IF EXISTS workflow_instances_id_seq;--> statement-breakpoint
ALTER TABLE "workflow_instances" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "workflow_instances_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "form_definitions" ADD COLUMN "is_current" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "form_definitions" ADD COLUMN "created_by" varchar NOT NULL DEFAULT 'system';--> statement-breakpoint
ALTER TABLE "form_definitions" ALTER COLUMN "created_by" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "workflow_definitions" ADD COLUMN "is_current" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_definitions" ADD COLUMN "created_by" varchar NOT NULL DEFAULT 'system';--> statement-breakpoint
ALTER TABLE "workflow_definitions" ALTER COLUMN "created_by" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD COLUMN "created_by" varchar NOT NULL DEFAULT 'system';--> statement-breakpoint
ALTER TABLE "workflow_instances" ALTER COLUMN "created_by" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD COLUMN "updated_by" varchar NOT NULL DEFAULT 'system';--> statement-breakpoint
ALTER TABLE "workflow_instances" ALTER COLUMN "updated_by" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "workflow_definitions_form_definitions_map" ADD CONSTRAINT "wdfdm_workflow_definition_id_fk" FOREIGN KEY ("workflow_definition_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_definitions_form_definitions_map" ADD CONSTRAINT "wdfdm_form_definition_id_fk" FOREIGN KEY ("form_definition_id") REFERENCES "public"."form_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "form_definition_state_version_idx" ON "form_definitions" USING btree ("state","version");--> statement-breakpoint
CREATE UNIQUE INDEX "form_definition_is_current_idx" ON "form_definitions" USING btree ("state") WHERE "form_definitions"."is_current" = true;--> statement-breakpoint
CREATE INDEX "form_definition_schema_idx" ON "form_definitions" USING gin ("schema");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_definition_name_version_idx" ON "workflow_definitions" USING btree ("name","version");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_definition_is_current_idx" ON "workflow_definitions" USING btree ("name") WHERE "workflow_definitions"."is_current" = true;--> statement-breakpoint
CREATE INDEX "workflow_definition_machine_config_idx" ON "workflow_definitions" USING gin ("machine_config");--> statement-breakpoint
ALTER TABLE "form_definitions" DROP COLUMN "workflow_def_id";--> statement-breakpoint
ALTER TABLE "form_definitions" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "workflow_definitions" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "workflow_instances" DROP COLUMN "status";