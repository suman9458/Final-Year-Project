ALTER TABLE users
ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) NOT NULL DEFAULT 'pending';

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_kyc_status_check;

ALTER TABLE users
ADD CONSTRAINT users_kyc_status_check CHECK (kyc_status IN ('pending', 'approved', 'rejected'));
