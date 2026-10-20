-- Apply once to each feedback database (Production and Preview use separate databases).
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL,
  payload_hash text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);
CREATE INDEX IF NOT EXISTS feedback_submitted ON feedback (submitted_at DESC, id DESC)
  WHERE submitted_at IS NOT NULL;
