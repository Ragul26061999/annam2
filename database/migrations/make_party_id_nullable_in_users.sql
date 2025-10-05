-- Make party_id nullable in users table to fix registration error
ALTER TABLE users 
ALTER COLUMN party_id DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN users.party_id IS 'Optional reference to party table - can be null for patients without party records';
