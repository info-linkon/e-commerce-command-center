-- Read-only MCP data server (edge function `mcp-data`) for the site owner's Claude.
-- Access token lives in Vault; only the service role (the edge function) can check it.
-- Rotate: UPDATE via vault.update_secret(...) on the 'mcp_data_token' secret.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'mcp_data_token') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'mcp_data_token', 'Access token for the read-only MCP data connector (mcp-data)');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.verify_mcp_data_token(p_token text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'mcp_data_token' AND decrypted_secret = p_token
  );
$$;

REVOKE ALL ON FUNCTION public.verify_mcp_data_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_mcp_data_token(text) TO service_role;
