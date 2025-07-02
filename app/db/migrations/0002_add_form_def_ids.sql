-- Add form_def_ids column to workflow_definitions table
ALTER TABLE workflow_definitions ADD COLUMN form_def_ids JSONB;

-- Update existing rows to have an empty object as default value
UPDATE workflow_definitions SET form_def_ids = '{}'::jsonb WHERE form_def_ids IS NULL; 