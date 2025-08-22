ALTER TABLE "form_data_versions" ALTER COLUMN "workflow_instance_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "form_data_versions" ALTER COLUMN "form_def_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "form_definitions" ALTER COLUMN "workflow_def_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "workflow_instances" ALTER COLUMN "workflow_def_id" SET DATA TYPE integer;