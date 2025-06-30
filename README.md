# Cloudflare MCP Server

Modern Model-Context-Protocol (MCP) server that exposes **Cloudflare** DNS, security, redirects and zone-settings functionality as structured *tools* which any compliant AI client (e.g. Claude Desktop) can invoke.


---

## ✨ Key Features

* **Rich Tool Catalog** – 16 read & write operations covering DNS records, WAF rules, page-rule redirects, cache purge, zone settings and more.
* **Plug-and-Play with Claude Desktop** – ships with STDIO transport so Claude immediately lists & calls tools; no extra adaptor required.
* **Type-Safe** – written in TypeScript and powered by `@modelcontextprotocol/sdk`, with zod schemas for every tool’s params & return value.
* **Non-destructive by Default** – destructive certificate-ordering functions are disabled out-of-the-box to prevent accidental cost.
* **Script Library & Tests** – one-shot scripts for manual ops plus Jest integration/unit tests.

---

## 🚀 Quick Start

```bash
# 1. Clone & install
npm install

# 2. Configure credentials
cp config/.env.example .env
$EDITOR .env          # put your CLOUDFLARE_API_TOKEN

# 3. Build & run the server (stdio)
npm run build
node dist/index.js    # Claude Desktop will auto-detect
```

> Need a sandbox? [Cloudflare Workers Free Plan](https://workers.cloudflare.com/) lets you create test zones.

---

## 🛠️ Tool Catalog

| Category | Tool Name | Description |
|----------|-----------|-------------|
| General  | `echo` | Round-trip text for connectivity testing |
| Zones    | `list_zones` | Enumerate zones the token can access |
| Zones    | `get_zone_settings` | Return full settings object |
| Zones    | `list_zone_settings` | Short settings summary |
| DNS      | `list_dns_records` | Read all DNS RRsets |
| DNS      | `create_dns_record`* | Add a record |
| DNS      | `update_dns_record`* | Modify record |
| DNS      | `delete_dns_record`* | Remove record |
| Security | `list_waf_rules` | Read firewall rules |
| Security | `create_security_rule`* | Add firewall rule |
| Security | `update_security_rule`* | Edit firewall rule |
| Security | `delete_security_rule`* | Delete firewall rule |
| Redirect | `list_page_rules` | List redirects/page-rules |
| Redirect | `create_redirect`* | Create redirect |
| Redirect | `delete_page_rule`* | Delete redirect |
| Cache    | `purge_cache`* | Purge URL or everything |

\* Destructive operations – use with care.

SSL cert ordering/upload functions are intentionally **not** registered. Enable them by removing the filter in `src/index.ts` if required.

---

## 🧑‍💻 Development

```bash
# Watch-mode compile
npm run dev

# Run the full test suite
npm test

# Lint
npm run lint
```

Handy demo scripts live under `scripts/` (e.g. `scripts/list-dns-demo.ts`). All accept a `--zone` flag.

---

## 🏗️ Architecture

* `src/index.ts` – entrypoint; merges tool maps and registers them with `McpServer`.
* `src/tools/` – individual tool modules, each exporting `{ tools, description }`.
* `src/cloudflare-client.ts` – thin wrapper around axios + CF API base URL.
* `tests/` – Jest tests (unit + integration).

The server communicates over STDIO using JSON-RPC 2.0 as defined by the MCP SDK. See [`docs/API.md`](docs/API.md).

---

## 🤝 Contributing

PRs & issues are welcome! Please read [`REFERENCE.md`](REFERENCE.md) for coding conventions and style guidelines.

1. Fork → feature branch → PR.
2. Ensure `npm test` passes.
3. Describe the tool behaviour or bug clearly.

---

## 📜 License

MIT © 2025 Jeff Golden

Made with Windsurf