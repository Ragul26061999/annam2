-- Add edited and verified boolean fields to medicine_batches table
ALTER TABLE medicine_batches 
ADD COLUMN edited BOOLEAN DEFAULT FALSE,
ADD COLUMN verified BOOLEAN DEFAULT FALSE;

-- Add indexes for better performance on these new fields
CREATE INDEX idx_medicine_batches_edited ON medicine_batches(edited);
CREATE INDEX idx_medicine_batches_verified ON medicine_batches(verified);

-- Add comment to document the purpose of these fields
COMMENT ON COLUMN medicine_batches.edited IS 'Indicates if the batch has been edited/modified';
COMMENT ON COLUMN medicine_batches.verified IS 'Indicates if the batch has been verified for accuracy';
