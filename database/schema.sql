CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  planned_team_size INTEGER NOT NULL DEFAULT 1 CHECK (planned_team_size > 0),
  start_date DATE,
  end_date DATE,
  client_relationship TEXT NOT NULL DEFAULT 'new' CHECK (client_relationship IN ('new', 'existing')),
  proposal_request TEXT NOT NULL DEFAULT '',
  backend_story TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Existing databases may already have proposals. New proposals are always user-owned.
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES app_users(id) ON DELETE CASCADE;
DO $$
DECLARE legacy_constraint TEXT;
BEGIN
  SELECT conname INTO legacy_constraint FROM pg_constraint
  WHERE conrelid = 'proposals'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%sharepoint_url%';
  IF legacy_constraint IS NOT NULL THEN EXECUTE format('ALTER TABLE proposals DROP CONSTRAINT %I', legacy_constraint); END IF;
END $$;

CREATE TABLE IF NOT EXISTS proposal_technologies (
  id BIGSERIAL PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  technology TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  UNIQUE(proposal_id, technology)
);

CREATE TABLE IF NOT EXISTS proposal_modules (
  id BIGSERIAL PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  module_type TEXT NOT NULL DEFAULT 'Build',
  story_points INTEGER NOT NULL DEFAULT 1 CHECK (story_points > 0),
  development_people INTEGER NOT NULL DEFAULT 0 CHECK (development_people >= 0),
  qa_people INTEGER NOT NULL DEFAULT 0 CHECK (qa_people >= 0),
  performance_people INTEGER NOT NULL DEFAULT 0 CHECK (performance_people >= 0),
  estimated_weeks INTEGER NOT NULL DEFAULT 1 CHECK (estimated_weeks > 0),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS proposal_roles (
  id BIGSERIAL PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  people_count INTEGER NOT NULL DEFAULT 0 CHECK (people_count >= 0),
  UNIQUE(proposal_id, role_name)
);

CREATE TABLE IF NOT EXISTS proposal_attachments (
  id BIGSERIAL PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  file_data BYTEA NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_updated_at ON proposals(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON proposals(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_modules_proposal_id ON proposal_modules(proposal_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_attachments_proposal_id ON proposal_attachments(proposal_id, uploaded_at DESC);
