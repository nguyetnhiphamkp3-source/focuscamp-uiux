-- Add multi-provider AI Agent support to Community
ALTER TABLE "Community"
  ADD COLUMN IF NOT EXISTS "agentProvider" TEXT DEFAULT 'anthropic',
  ADD COLUMN IF NOT EXISTS "agentModel"    TEXT;
