-- Add vacation_days column if it doesn't exist and backfill to 0
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS vacation_days INTEGER DEFAULT 0;

-- Ensure no NULLs remain
UPDATE employees SET vacation_days = 0 WHERE vacation_days IS NULL;

-- Optional: create an index for queries by vacation_days (not required)
-- CREATE INDEX IF NOT EXISTS idx_employees_vacation_days ON employees(vacation_days);
