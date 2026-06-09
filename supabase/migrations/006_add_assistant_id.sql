-- Each user gets their own Vapi assistant and (optionally) Twilio number
ALTER TABLE public.agent_wizard_sessions
  ADD COLUMN IF NOT EXISTS vapi_assistant_id text,
  ADD COLUMN IF NOT EXISTS twilio_phone_number text;

-- Fast lookup: webhook resolves user_id by matching incoming assistantId
CREATE INDEX IF NOT EXISTS agent_wizard_sessions_vapi_assistant_id_idx
  ON public.agent_wizard_sessions (vapi_assistant_id)
  WHERE vapi_assistant_id IS NOT NULL;
