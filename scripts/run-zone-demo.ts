// scripts/run-zone-demo.ts
// Simple demo to list zones and fetch settings for the first zone found.
// Requires CLOUDFLARE_API_TOKEN in environment variables.
import 'dotenv/config';
import { CloudflareClient } from '../src/cloudflare-client.ts';
import { getZoneManagementTools } from '../src/tools/zone-management.ts';

(async () => {
  try {
    const client = new CloudflareClient();
    const { tools } = getZoneManagementTools(client);

    console.log('Fetching zones...');
    const zones = await (tools['cloudflare-dns-mcp/list_zones'] as any).handler({}) as any[];
    console.log(`Found ${zones.length} zone(s):`);
    console.dir(zones, { depth: null });

    if (zones.length) {
      const first = zones[0];
      console.log(`\nFetching settings for zone: ${first.name}`);
      const settings = await (tools['cloudflare-dns-mcp/get_zone_settings'] as any).handler({ zone_name: first.name });
      console.dir(settings, { depth: null });
    }
  } catch (err) {
    console.error('Error running demo:', err);
    process.exitCode = 1;
  }
})();
