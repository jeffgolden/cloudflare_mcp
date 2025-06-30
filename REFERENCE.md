# Cloudflare MCP – Comprehensive Tool Reference

> **Status**: June 29 2025 – covers every tool currently present in `src/tools` and all associated demo scripts.
>
> This single document fully supersedes the older `spec.md` and `IMPLEMENTED_FEATURES.md`.  
> Delete or archive those files after reviewing this one.

---

## 1  Project Overview

Model-Context-Protocol (MCP) exposes a curated subset of Cloudflare’s REST API as **typed tools** an LLM agent can safely call.  
The goals are:

* Smooth, self-documenting API surface that hides Cloudflare quirks.
* Safe defaults – destructive operations flagged and demoed in non-impacting ways.
* Minimal cognitive load – a user or agent never needs to read Cloudflare’s docs to perform common tasks.

The implementation lives in `src/tools`, each file returning a `{ tools }` map.  All tools share a singleton `CloudflareClient` wrapper.

---

## 2  Quick-Start

```bash
# 1. Supply a token with at least the scopes you need.
export CLOUDFLARE_API_TOKEN="..."

# 2. Install dependencies & run tests
pnpm install
pnpm test

# 3. Run the live regression suite (safe – only non-destructive)
pnpm tsx scripts/live-regression.ts
```

---

## 3  Environment Variables

| Var | Purpose | Example |
|-----|---------|---------|
| `CLOUDFLARE_API_TOKEN` | Bearer token used for every request. Must include scopes matching the tool you call (e.g. _Cache Purge_, _Firewall Rules_, _Page Rules_). | `abcd1234` |
| `CLOUDFLARE_API_BASE_URL` _(optional)_ | Override CF base URL (useful for mock server). Defaults to `https://api.cloudflare.com/client/v4`. | `http://localhost:8787` |

---

## 4  General Conventions

* **All tools return raw Cloudflare `result` fields** – no extra wrapping.
* **Zod validation** ensures required params and safe defaults.
* Tools with real-world side effects are marked `annotations.destructiveHint = true` so an agent can require explicit user approval.
* Error handling: `CloudflareClient` converts every non-`success` response into an `Error('Cloudflare API Error: …')` with codes.

---

## 5  Tool Catalog

### 5.1  Core Utility

| Tool | Description |
|------|-------------|
| `echo` | Simple connectivity check; echoes the supplied `message`. |

**Input**
```jsonc
{
  "message": "string"
}
```

**Returns** `{"message": "string"}`

---

### 5.2  Zone Management

| Tool | Destructive? | Purpose |
|------|--------------|---------|
| `list_zones` | ❌ | List all zones available to the token. |
| `get_zone_settings` | ❌ | Fetch full settings array for a zone. |
| `update_zone_settings` | ✅ | PATCH selective settings (`{ items: [ { id, value } ] }`). |
| `purge_cache` | ✅ | Purge cache (everything, files, tags, hosts). |

#### 5.2.1  `list_zones`
```jsonc
{}
```
Returns: `Array<Zone>` (raw Cloudflare objects).

#### 5.2.2  `get_zone_settings`
```jsonc
{
  "zone_name": "example.com"
}
```
Returns: `Array<{ id: string; value: any; editable: boolean; modified_on: string }>`

#### 5.2.3  `update_zone_settings`
```jsonc
{
  "zone_name": "example.com",
  "settings": {
    "minify": { "css": "on", "html": "off", "js": "off" },
    "always_use_https": "on"
  }
}
```
*Internally converted to* `{ items: [ { id: 'minify', value: … }, { id: 'always_use_https', value: 'on' } ] }`.

Returns: The updated settings array.

#### 5.2.4  `purge_cache`
```jsonc
{
  "zone_name": "example.com",
  "purge_type": "everything"        // or "files" | "tags" | "hosts"
  // when not "everything", also pass `targets: string[]`
}
```
Returns: `{ id: string }` confirmation object.

---

### 5.3  Redirects & Page Rules

| Tool | Destructive? | Purpose |
|------|--------------|---------|
| `list_page_rules` | ❌ | List page rules (optionally filter by `status`). |
| `create_redirect` | ✅ | Add a redirect rule; can start disabled. |
| `delete_page_rule` | ✅ | Delete a page-rule by ID. |

#### Shared Params
`zone_name` is **always** required and case-insensitive.

#### 5.3.1  `list_page_rules`
```jsonc
{
  "zone_name": "example.com",
  "status": "disabled"   // optional: "active" | "disabled"
}
```
Returns: `Array<PageRule>`

#### 5.3.2  `create_redirect`
```jsonc
{
  "zone_name": "example.com",
  "source_url": "example.com/old/*",
  "target_url": "https://new.com/$1",
  "redirect_type": 302,          // default 301
  "preserve_query_string": true, // default true
  "priority": 1,                 // optional, CF executes low numbers first
  "status": "disabled"          // "active"|"disabled"; default "active"
}
```
Returns: `PageRule`

#### 5.3.3  `delete_page_rule`
```jsonc
{
  "zone_name": "example.com",
  "rule_id": "8d8d…"
}
```
Returns: `{ id, deleted: true }`

---

### 5.4  Security & WAF

| Tool | Destructive? | Purpose |
|------|--------------|---------|
| `list_waf_rules` | ❌ | Enumerate firewall rules. |
| `create_security_rule` | ✅ | Add custom WAF rule (paused by default is recommended). |
| `update_security_rule` | ✅ | PUT full or partial updates (must include `filter.id` + `expression`). |
| `delete_security_rule` | ✅ | Remove WAF rule by ID. |

#### 5.4.1  `list_waf_rules`
```jsonc
{
  "zone_name": "example.com",
  "rule_type": "managed" // optional
}
```
Returns: `Array<FirewallRule>`

#### 5.4.2  `create_security_rule`
```jsonc
{
  "zone_name": "example.com",
  "rule_name": "mcp-test",
  "expression": "(http.host eq \"test.invalid\")",
  "action": "block",
  "priority": 1000,
  "paused": true
}
```
Returns: `FirewallRule`

#### 5.4.3  `update_security_rule`
```jsonc
{
  "zone_name": "example.com",
  "rule_id": "908e…",
  "description": "updated",      // optional
  "expression": "(http.host eq \"test.invalid\")", // **required** if you change filter
  "action": "block",            // keep same unless you intend to change it
  "paused": false
}
```
Returns: updated `FirewallRule`.

#### 5.4.4  `delete_security_rule`
```jsonc
{
  "zone_name": "example.com",
  "rule_id": "908e…"
}
```
Returns: `{ id, deleted: true }`

---

## 6  Demo Scripts

| Script | Purpose |
|--------|---------|
| `live-regression.ts` | Runs safest read-only tools + `echo`. |
| `purge-cache-demo.ts` | Purge cache end-to-end. |
| `list-redirects-demo.ts` | List active redirects. |
| `list-redirects-all.ts` | List redirects regardless of status. |
| `create-temp-redirect.ts` | Create disabled redirect for testing. |
| `delete-temp-redirect.ts` | Delete the above. |
| `security-rule-demo.ts` | Safe create → update → delete WAF flow. |
| `update-zone-setting-demo.ts` | Example PATCH for zone settings. |

All demos assume the token grants the needed scopes and use the `jeffgolden.dev` zone by default—edit inline.

---

## 7  Testing & CI

* **Unit tests** live under `src/**/*.test.ts` (see TXT record helpers as reference). Run with `pnpm test`.
* **Integration**: The demo scripts double as manual integration tests; wire them into your CI with a dummy zone if you wish.

---

## 8  Contributing Guidelines

1. Add new tools inside an existing `src/tools/*.ts` or create a new file returning a `tools` map.
2. Follow existing Zod schema + `zodToJsonSchema` pattern so type generation stays consistent.
3. For destructive actions set `annotations.destructiveHint = true`.
4. Update **this** document: category table + full subsection with example payload.
5. Provide at least one demo script or unit test.

---

## 9  Change-Log (excerpt)

* **2025-06-29** – Comprehensive reference created, replaces `spec.md` & `IMPLEMENTED_FEATURES.md`.
* **2025-06-29** – Added `update_security_rule`, `delete_security_rule`, `delete_page_rule` helpers.
* **2025-06-28** – Implemented redirect & WAF tools, removed deprecated SSL write-paths.
