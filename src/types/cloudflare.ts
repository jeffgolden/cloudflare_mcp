// src/types/cloudflare.ts

export interface DNSRecord {
  id: string;
  zone_id: string;
  zone_name: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
  proxied?: boolean;
  created_on: string;
  modified_on: string;
}

export interface Zone {
  id: string;
  name: string;
  status: string;
  paused: boolean;
  type: string;
  development_mode: number;
  name_servers: string[];
  original_name_servers: string[];
  original_registrar: string;
  original_dnshost: string;
  modified_on: string;
  created_on: string;
  activated_on: string;
  owner: {
    id: string;
    type: string;
    email: string;
  };
  account: {
    id: string;
    name: string;
  };
  permissions: string[];
  plan: object; // Can be defined further if needed
}

export interface ZoneSettings {
  ssl?: 'off' | 'flexible' | 'full' | 'strict';
  security_level?: 'essentially_off' | 'low' | 'medium' | 'high' | 'under_attack';
  cache_level?: 'aggressive' | 'basic' | 'simplified';
  minify?: {
    js?: 'on' | 'off';
    css?: 'on' | 'off';
    html?: 'on' | 'off';
  };
  brotli?: 'on' | 'off';
  early_hints?: 'on' | 'off';
  websockets?: 'on' | 'off';
  http2?: 'on' | 'off';
  http3?: 'on' | 'off';
  zero_rtt?: 'on' | 'off';
  ipv6?: 'on' | 'off';
}

export interface WAFRule {
    id: string;
    description: string;
    priority: number;
    action: string;
    expression: string;
    paused: boolean;
}

export interface Certificate {
    id: string;
    hosts: string[];
    status: string;
    expires_on: string;
    bundle_method: string;
}

// Generic API response structure from Cloudflare
export interface CloudflareResponse<T> {
    result: T;
    success: boolean;
    errors: { code: number; message: string }[];
    messages: { code: number; message: string }[];
    result_info?: {
        page: number;
        per_page: number;
        count: number;
        total_count: number;
    };
}
