CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  planned_team_size INTEGER NOT NULL DEFAULT 1 CHECK (planned_team_size > 0),
  start_date DATE,
  end_date DATE,
  client_relationship TEXT NOT NULL DEFAULT 'new' CHECK (client_relationship IN ('new', 'existing')),
  proposal_request TEXT NOT NULL DEFAULT '',
  backend_story TEXT NOT NULL DEFAULT '',
  sharepoint_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (client_relationship <> 'existing' OR sharepoint_url IS NOT NULL)
);

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

CREATE INDEX IF NOT EXISTS idx_proposals_updated_at ON proposals(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_modules_proposal_id ON proposal_modules(proposal_id, sort_order);
