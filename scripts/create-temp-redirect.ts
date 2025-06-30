// scripts/create-temp-redirect.ts
import 'dotenv/config';
import { CloudflareClient } from '../src/cloudflare-client.ts';
import { getRedirectTools } from '../src/tools/redirects.ts';

(async () => {
  const zone = 'jeffgolden.dev';
  const client = new CloudflareClient();
  const { tools } = getRedirectTools(client);
  const result = await (tools['cloudflare-dns-mcp/create_redirect'] as any).handler({
    zone_name: zone,
    source_url: `${zone}/__mcp-test/*`,
    target_url: 'https://example.com/$1',
    redirect_type: 302,
    preserve_query_string: true,
    priority: 10,
    status: 'disabled',
  });
  console.log('Created temp redirect:', result.id || result.result?.id || result);
})();
