import { cartridgeConfigSchema } from './config.js';

export function compileCartridge(input: unknown, endpoint: string) {
  const config = cartridgeConfigSchema.parse(input);
  const url = new URL(endpoint);
  if (url.username || url.password || url.search || url.hash ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) {
    throw new Error('MCP endpoint must be HTTPS (HTTP is allowed on loopback only), without credentials, query, or fragment.');
  }
  const skill = `---\nname: ${JSON.stringify(config.name)}\ndescription: ${JSON.stringify(config.description)}\n---\n\n# ${config.name} (v${config.version})\n\n## Standard operating procedure\n\n${config.sop.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n## Read tools (free)\n\n${config.queries.map(q => `- **${q.name}**: ${q.description}${q.filterColumn ? ` Optional filter_value matches ${q.filterColumn}.` : ''} Returns at most 50 rows.`).join('\n')}\n- **cartridge_status**: Read your plan, balance, and checkout URL.\n\n## Intent tools\n\n${config.intents.map(i => `### ${i.name}\n${i.description}\n\nBilling: ${i.creditCostNote}\n\n${Object.entries(i.params).map(([name, p]) => `- **${name}** (required ${p.enum?.join(' | ') ?? p.type}): ${p.description}`).join('\n')}`).join('\n\n')}\n\n## Undo\n\n**cartridge_undo** requires **p_audit_id** (UUID). Restores an audited update only if the row still matches its recorded after-state; refunds the actual debit once. Conflicts require human review.\n`;
  return {
    manifest: config, skill,
    mcp: { mcpServers: { [config.name]: { type: 'http', url: url.href } } },
  };
}
