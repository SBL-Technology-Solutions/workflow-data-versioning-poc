-- Custom SQL migration file, put your code below! --

CREATE OR REPLACE FUNCTION states_keys(obj jsonb)
RETURNS text[] AS $$
  SELECT array_agg(key)
  FROM jsonb_object_keys(obj) AS key;
$$ LANGUAGE sql IMMUTABLE;

-- ALTER TABLE "workflow_definitions"
-- ADD COLUMN "states" text[]
-- GENERATED ALWAYS AS (states_keys("machine_config"->'states')) STORED;    