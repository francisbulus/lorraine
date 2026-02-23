// MaintainerOS application-level types.
// Engine types are re-exported from ./engine.ts.

export interface MosConfig {
  store: {
    backend: 'sqlite';
    path: string;
  };
  repo?: string;
  llm?: {
    provider: string;
    model: string;
  };
  integrations?: {
    github?: { enabled: boolean; repo: string };
    incidents?: { enabled: boolean; provider: string };
  };
  notifications?: {
    channel: string;
  };
}

export interface DomainPack {
  id?: string;
  name?: string;
  description?: string;
  version?: string;
  concepts: { id: string; name: string; description: string }[];
  edges: { from: string; to: string; type: string; inferenceStrength: number }[];
  mappings?: Record<string, { paths: string[] }>;
  bundles?: Record<string, BundleDefinition>;
}

export interface BundleDefinition {
  required: BundleRequirement[];
}

export interface BundleRequirement {
  concept: string;
  minLevel: 'verified' | 'inferred';
  minConfidence?: number;
}

export interface DomainMetadata {
  id: string;
  name: string;
  version: string;
  loadedAt: string;
  conceptCount: number;
  edgeCount: number;
}

export type OutputFormat = 'table' | 'json' | 'yaml';

// Exit codes per CLI spec
export const EXIT_SUCCESS = 0;
export const EXIT_POLICY_UNMET = 2;
export const EXIT_CONFIG_ERROR = 3;
export const EXIT_UPSTREAM_ERROR = 4;
export const EXIT_STORAGE_ERROR = 5;
export const EXIT_LLM_ERROR = 6;
