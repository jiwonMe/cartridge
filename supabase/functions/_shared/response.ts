export const MAX_INLINE_BYTES = 15 * 1024;
export const MAX_EXPORT_BYTES = 10 * 1024 * 1024;
export const EXPORT_TTL_SECONDS = 900;
const encode = (value: unknown) => JSON.stringify(value) ?? 'null';
const size = (text: string) => new TextEncoder().encode(text).length;
export interface ExportStore {
  upload(path: string, body: string): Promise<void>;
  sign(path: string, seconds: number): Promise<string>;
  remove(path: string): Promise<void>;
}

/** Bound tool text, not the entire JSON-RPC frame. Never retry a mutation on delivery failure. */
export async function formatSafeMcpResponse(store: ExportStore, userId: string, data: unknown, error: unknown) {
  const body = error ? { ok: false, error_code: 'DATABASE_ERROR', remediation: 'Check arguments and contact the operator if the problem persists.' } : data;
  const isError = Boolean(error) || (body !== null && typeof body === 'object' && 'ok' in body && body.ok === false);
  const response = (value: unknown) => ({ isError, content: [{ type: 'text' as const, text: encode(value) }] });
  const serialized = encode(body);
  const bytes = size(serialized);
  if (bytes <= MAX_INLINE_BYTES) return response(body);
  const control: Record<string, unknown> = {};
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    for (const key of ['ok', 'audit_id', 'reverted_audit_id', 'charged_credits', 'refunded_credits', 'remaining_credits', 'error_code', 'remediation']) {
      const value = (body as Record<string, unknown>)[key];
      if (typeof value === 'boolean' || typeof value === 'number' || (typeof value === 'string' && size(encode(value)) <= 1024)) control[key] = value;
    }
  }
  const samples: unknown[] = [];
  if (Array.isArray(body)) {
    for (const row of body.slice(0, 3)) {
      if (size(encode([...samples, row])) > 2048) break;
      samples.push(row);
    }
  }
  const base = { ...control, original_size_bytes: bytes,
    preview: Array.isArray(body) ? { returned_count: body.length, sample_rows: samples } : { note: 'Large object; inspect the export for full data.' } };
  const failure = (code: string) => response({ ...base, offloaded: false, delivery_error: code,
    agent_instructions: 'The operation outcome is unchanged; only response delivery failed. Do not repeat a mutation. Preserve audit_id and inspect current state. For reads, narrow filters or ask the operator for an export.' });
  if (bytes > MAX_EXPORT_BYTES) return failure('EXPORT_TOO_LARGE');
  const path = `${userId}/${crypto.randomUUID()}.json`;
  let uploaded = false;
  try {
    await store.upload(path, serialized);
    uploaded = true;
    const url = await store.sign(path, EXPORT_TTL_SECONDS);
    if (!url || size(url) > 4096 || new URL(url).protocol !== 'https:') throw new Error('Invalid signed URL');
    return response({ ...base, offloaded: true, signed_download_url: url, expires_in_seconds: EXPORT_TTL_SECONDS,
      agent_instructions: 'Treat this URL as a private bearer credential. Web agents: show it only to the requesting user. CLI agents: download to a local file with a trusted HTTP client and analyze locally; do not dump the full file into context. The URL is reusable until expiry. No mutation retry is needed.' });
  } catch {
    if (uploaded) { try { await store.remove(path); } catch { /* Operator retention cleanup handles orphans. */ } }
    return failure('EXPORT_UNAVAILABLE');
  }
}
