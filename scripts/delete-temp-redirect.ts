// scripts/delete-temp-redirect.ts
import 'dotenv/config';
import { CloudflareClient } from '../src/cloudflare-client.ts';
import { getRedirectTools } from '../src/tools/redirects.ts';

(async () => {
  const zone = 'jeffgolden.dev';
  const ruleId = 'eb7f969d14327bac3d33a2fef1e11e16';
  const client = new CloudflareClient();
  const { tools } = getRedirectTools(client);
  const resp = await (tools['cloudflare-dns-mcp/delete_page_rule'] as any).handler({ zone_name: zone, rule_id: ruleId });
  console.log(resp);
})();
