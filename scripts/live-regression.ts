// scripts/live-regression.ts
// Runs a quick, read-only regression across all non-destructive tools.
import 'dotenv/config';
import { CloudflareClient } from '../src/cloudflare-client.ts';
import { getZoneManagementTools } from '../src/tools/zone-management.ts';
import { getDnsTools } from '../src/tools/dns-records.ts';
import { getSslCertTools } from '../src/tools/ssl-certs.ts';
import { getSecurityTools } from '../src/tools/security.ts';
import { getEchoTools } from '../src/tools/echo.ts';

const ZONE = process.argv[2] || 'jeffgolden.dev';

(async () => {
  const client = new CloudflareClient();
  const zoneTools = getZoneManagementTools(client).tools;
  const dnsTools = getDnsTools(client).tools;
  const sslTools = getSslCertTools(client).tools;
  const secTools = getSecurityTools(client).tools;
  const echoTools = getEchoTools().tools;

  // 1. list_zones
  const zones = await (zoneTools['cloudflare-dns-mcp/list_zones'] as any).handler({});
  console.log(`list_zones -> ${zones.length} zones`);

  // 2. get_zone_settings
  const settings = await (zoneTools['cloudflare-dns-mcp/get_zone_settings'] as any).handler({ zone_name: ZONE });
  console.log(`get_zone_settings -> got ${Array.isArray(settings) ? settings.length : Object.keys(settings).length} setting entries for ${ZONE}`);

  // 3. list_dns_records
  const records = await (dnsTools['cloudflare-dns-mcp/list_dns_records'] as any).handler({ zone_name: ZONE });
  console.log(`list_dns_records -> ${records.length} records for ${ZONE}`);

  // 4. list_ssl_certs
  const certs = await (sslTools['cloudflare-dns-mcp/list_ssl_certs'] as any).handler({ zone_name: ZONE });
  console.log(`list_ssl_certs -> ${certs.length} certificate pack(s) for ${ZONE}`);

  // 5. echo connectivity
  const echoResp = await (echoTools['cloudflare-dns-mcp/echo'] as any).handler({ message: 'ping' });
  console.log(`echo -> ${echoResp.message}`);

  // 6. list_waf_rules
  const wafRules = await (secTools['cloudflare-dns-mcp/list_waf_rules'] as any).handler({ zone_name: ZONE });
  console.log(`list_waf_rules -> ${wafRules.length} WAF rule(s) for ${ZONE}`);
})();
