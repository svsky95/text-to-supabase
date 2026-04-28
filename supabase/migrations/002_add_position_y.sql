-- Add position_y column to forest table for mountain height
ALTER TABLE forest ADD COLUMN IF NOT EXISTS position_y REAL DEFAULT 0;

-- Backfill existing trees with 0 (ground level)
UPDATE forest SET position_y = 0 WHERE position_y IS NULL;

-- Add NOT NULL constraint after backfill
ALTER TABLE forest ALTER COLUMN position_y SET NOT NULL;
ALTER TABLE forest ALTER COLUMN position_y SET DEFAULT 0;
