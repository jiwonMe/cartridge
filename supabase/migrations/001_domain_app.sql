CREATE TABLE public.work_sets (
  id text PRIMARY KEY,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
  unverified_count integer NOT NULL DEFAULT 0 CHECK (unverified_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.work_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY work_sets_read ON public.work_sets FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY work_sets_intent ON public.work_sets FOR ALL TO cartridge_executor
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
-- Clients cannot bypass billing with direct UPDATE or forge engine snapshots.
REVOKE ALL ON public.work_sets FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.work_sets TO authenticated;
GRANT SELECT, UPDATE ON public.work_sets TO cartridge_executor;
INSERT INTO cartridge.undo_targets(table_name) VALUES ('work_sets');

CREATE FUNCTION public.rpc_publish_work_set(p_set_id text, p_target_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  b public.work_sets; a public.work_sets;
  s text; m text; d text; h text;
BEGIN
  SELECT * INTO b FROM public.work_sets WHERE id = p_set_id FOR UPDATE;
  PERFORM cartridge.assert(FOUND, 'SET_NOT_FOUND', 'Work set not found.', 'Call list_work_sets to find an accessible ID.');
  PERFORM cartridge.assert(p_target_status IN ('draft', 'review', 'published'), 'INVALID_STATUS',
    'Invalid publication state.', 'Use draft, review, or published.');
  PERFORM cartridge.assert(p_target_status <> b.status, 'NO_STATE_CHANGE',
    'The work set already has this status.', 'No action is necessary.');
  PERFORM cartridge.assert(NOT (p_target_status = 'published' AND b.unverified_count > 0),
    'UNVERIFIED_ITEMS_REMAIN', 'Unverified items remain.', 'Move to review or complete verification before publishing.');
  UPDATE public.work_sets SET status = p_target_status, updated_at = clock_timestamp()
    WHERE id = p_set_id RETURNING * INTO a;
  RETURN cartridge.commit_and_charge('publish_work_set', 'work_sets', p_set_id, to_jsonb(b), to_jsonb(a),
    CASE WHEN p_target_status = 'published' THEN 1 ELSE 0 END);
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS s = RETURNED_SQLSTATE, m = MESSAGE_TEXT, d = PG_EXCEPTION_DETAIL, h = PG_EXCEPTION_HINT;
  RETURN cartridge.catch_error(s, m, d, h);
END;
$$;
-- A NOLOGIN, non-owner, non-BYPASSRLS role executes intents. auth.uid() still comes from the caller JWT.
GRANT CREATE ON SCHEMA public TO cartridge_executor;
ALTER FUNCTION public.rpc_publish_work_set(text,text) OWNER TO cartridge_executor;
REVOKE CREATE ON SCHEMA public FROM cartridge_executor;
REVOKE ALL ON FUNCTION public.rpc_publish_work_set(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_publish_work_set(text,text) TO authenticated;
