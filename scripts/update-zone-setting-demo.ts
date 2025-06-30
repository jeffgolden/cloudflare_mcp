// scripts/update-zone-setting-demo.ts
import 'dotenv/config';
import { CloudflareClient } from '../src/cloudflare-client.ts';
import { getZoneManagementTools } from '../src/tools/zone-management.ts';

(async () => {
  const zone = 'jeffgolden.dev';
  const client = new CloudflareClient();
  const { tools } = getZoneManagementTools(client);

  // fetch current settings array
  const settingsArr = await (tools['cloudflare-dns-mcp/get_zone_settings'] as any).handler({ zone_name: zone });
  const minify = settingsArr.find((s: any) => s.id === 'minify');
  const current = minify?.value?.css ?? 'off';

  const newValue = current === 'on' ? 'off' : 'on';
  console.log(`Toggling minify.css from ${current} to ${newValue}`);

  // update
  await (tools['cloudflare-dns-mcp/update_zone_settings'] as any).handler({
    zone_name: zone,
    settings: { minify: { css: newValue } },
  });

  // verify
  const afterArr = await (tools['cloudflare-dns-mcp/get_zone_settings'] as any).handler({ zone_name: zone });
  const afterMinify = afterArr.find((s: any) => s.id === 'minify');
  console.log('After update minify.css =', afterMinify.value.css);

  // revert
  await (tools['cloudflare-dns-mcp/update_zone_settings'] as any).handler({
    zone_name: zone,
    settings: { minify: { css: current } },
  });
  console.log('Reverted to original value');
})();
