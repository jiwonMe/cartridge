/** Empty configuration accepts any OAuth client from the verified issuer, not anonymous users. */
export function parseOAuthClientIds(value: string | undefined): string[] {
  return [...new Set((value ?? '').split(',').map(id => id.trim()).filter(Boolean))];
}

/** Call only after signature, issuer, audience and user validation. */
export function isOAuthClientAllowed(clientId: unknown, allowedIds: readonly string[]): boolean {
  return typeof clientId === 'string' && clientId.trim().length > 0 &&
    (allowedIds.length === 0 || allowedIds.includes(clientId));
}
