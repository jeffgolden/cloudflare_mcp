// scripts/list-ssl-demo.ts
import 'dotenv/config';
import { CloudflareClient } from '../src/cloudflare-client.ts';
import { getSslCertTools } from '../src/tools/ssl-certs.ts';

const ZONE = process.argv[2] || 'jeffgolden.dev';

(async () => {
  try {
    const client = new CloudflareClient();
    const { tools } = getSslCertTools(client);
    const packs = await (tools['cloudflare-dns-mcp/list_ssl_certs'] as any).handler({ zone_name: ZONE });
    console.dir(packs, { depth: null });
  } catch (err) {
    console.error('Error listing SSL certs:', err);
    process.exitCode = 1;
  }
})();
