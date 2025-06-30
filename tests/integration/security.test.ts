// @ts-nocheck
import nock from 'nock';
import { CloudflareClient } from '../../src/cloudflare-client.js';
import { getSecurityTools } from '../../src/tools/security.js';

// Ensure env token so CloudflareClient constructor passes
process.env.CLOUDFLARE_API_TOKEN = 'test-token';

const BASE_URL = 'https://api.cloudflare.com/client/v4';

describe('Security tools', () => {
  const zoneName = 'example.com';
  const zoneId = 'zone123';
  let client: CloudflareClient;
  let tools: ReturnType<typeof getSecurityTools>['tools'];

  beforeEach(() => {
    nock.cleanAll();
    client = new CloudflareClient();
    tools = getSecurityTools(client).tools;
  });

  afterAll(() => {
    nock.cleanAll();
  });

  describe('list_waf_rules', () => {
    it('returns firewall rules for a zone', async () => {
      // Mock zone lookup
      nock(BASE_URL)
        .get('/zones')
        .query({ name: zoneName })
        .reply(200, {
          success: true,
          errors: [],
          messages: [],
          result: [{ id: zoneId, name: zoneName }],
        });

      // Mock rules list
      const mockRules = [
        {
          id: 'rule1',
          description: 'block bad bot',
          action: 'block',
          expression: 'cf.bot_management.score < 30',
          paused: false,
          priority: 1,
        },
      ];

      nock(BASE_URL)
        .get(`/zones/${zoneId}/firewall/rules`)
        .query(true)
        .reply(200, {
          success: true,
          errors: [],
          messages: [],
          result: mockRules,
        });

      const handler = (tools['cloudflare-dns-mcp/list_waf_rules'] as any).handler as any;
      const result = await handler({ zone_name: zoneName });

      expect(result).toEqual(mockRules);
    });
  });

  describe('create_security_rule', () => {
    it('creates a firewall rule and returns it', async () => {
      // Mock zone lookup
      nock(BASE_URL)
        .get('/zones')
        .query({ name: zoneName })
        .reply(200, {
          success: true,
          errors: [],
          messages: [],
          result: [{ id: zoneId, name: zoneName }],
        });

      const createBodyMatcher = (body: any) => Array.isArray(body) && body[0].description === 'mcp-test';

      const createdRule = {
        id: 'rule-new',
        description: 'mcp-test',
        action: 'block',
        expression: 'http.host eq "bad.example"',
        paused: false,
      };

      nock(BASE_URL)
        .post(`/zones/${zoneId}/firewall/rules`, createBodyMatcher)
        .reply(200, {
          success: true,
          errors: [],
          messages: [],
          result: [createdRule],
        });

      const handler = (tools['cloudflare-dns-mcp/create_security_rule'] as any).handler as any;
      const result = await handler({
        zone_name: zoneName,
        rule_name: 'mcp-test',
        expression: 'http.host eq "bad.example"',
        action: 'block',
      });

      expect(result).toEqual(createdRule);
    });
  });
});
