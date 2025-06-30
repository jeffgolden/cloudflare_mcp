// scripts/security-rule-demo.ts
// Demonstrates safe create → update → delete cycle for a custom WAF rule
import 'dotenv/config';
import { CloudflareClient } from '../src/cloudflare-client.ts';
import { getSecurityTools } from '../src/tools/security.ts';

(async () => {
  const zone = 'jeffgolden.dev';
  const client = new CloudflareClient();
  const { tools } = getSecurityTools(client);

  // 1. Create a paused rule that matches no production traffic
  const createResp = await (tools['cloudflare-dns-mcp/create_security_rule'] as any).handler({
    zone_name: zone,
    rule_name: 'mcp-test-rule',
    expression: '(http.host eq "test.invalid")', // never matches
    action: 'block',
    paused: true,
    priority: 1000,
  });
  console.log('Created rule ID:', createResp.id);

  // 2. Update its description (no functional change)
  const updateResp = await (tools['cloudflare-dns-mcp/update_security_rule'] as any).handler({
    zone_name: zone,
    rule_id: createResp.id,
    description: 'mcp-test-rule-updated',
    expression: '(http.host eq "test.invalid")', // must include filter
    action: 'block',
  });
  console.log('Updated description:', updateResp.description);

  // 3. Delete the rule
  const deleteResp = await (tools['cloudflare-dns-mcp/delete_security_rule'] as any).handler({
    zone_name: zone,
    rule_id: createResp.id,
  });
  console.log('Delete result:', deleteResp);
})();
