/**
 * The single place Assay talks to a model.
 *
 * Deliberately provider-agnostic: any OpenAI-compatible chat-completions endpoint works, selected
 * entirely by environment variables. Judges will not have the author's provider, and Reproducibility
 * is a qualification gate, so nothing above this file may know which vendor is in use.
 *
 * Two properties matter more than convenience here:
 *
 *   1. Every call records the model that actually served it. A comparison between the baseline and
 *      the agent is only meaningful if both faced the same model; a silent downgrade mid-run would
 *      turn the headline number into a blend of two systems.
 *   2. Nothing depends on provider-specific features. No function calling, no JSON mode, no
 *      structured outputs — just text in, text out — so a smaller or older model on someone else's
 *      endpoint can still run the whole project.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/**
 * `process.loadEnvFile` is Node 22+. On an older Node it's just `undefined`, so calling it through
 * optional chaining would silently no-op: `.env` never loads, API keys stay unset, and the failure
 * surfaces later as a confusing "missing credentials" error instead of a clear version mismatch.
 */
function assertNodeVersion(): void {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 22) {
    throw new Error(
      `Assay requires Node >= 22.0.0 (process.loadEnvFile is used to read .env). ` +
        `Found Node ${process.version}. Install Node 22+ and retry.`,
    );
  }
}

/** Node 22 reads .env natively; no dependency needed. Safe to call more than once. */
export function loadEnv(): void {
  assertNodeVersion();
  const file = join(ROOT, '.env');
  if (!existsSync(file)) return;
  const runtime = process as NodeJS.Process & { loadEnvFile?: (path: string) => void };
  runtime.loadEnvFile?.(file);
}

loadEnv();

function env(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ClientOptions {
  /** Directory for per-call trace files. These are the runtime agent trajectories. */
  traceDir?: string;
  /** Label recorded on every trace, e.g. "baseline" or "agent". */
  actor?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionResult {
  text: string;
  /** The model the provider reports having served — not the one we asked for. */
  model: string;
  requestedModel: string;
  usedFallback: boolean;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  attempts: number;
}

export class MissingCredentialsError extends Error {}

/**
 * Which block of provider variables a run uses. Defaults to ASSAY_PRIMARY_*; setting
 * ASSAY_PROVIDER=frontier selects ASSAY_FRONTIER_* instead, so the same evaluation can be replayed
 * against a different model without editing .env.
 *
 * Deliberately a shell variable rather than a .env entry: the scored configuration stays in the
 * file, and swapping models is an explicit act on the command line that shows up in shell history.
 */
export function providerName(): string {
  return (process.env.ASSAY_PROVIDER ?? 'primary').trim().toLowerCase();
}

function readProvider(kind: 'primary' | 'fallback'): ProviderConfig | null {
  const selected = providerName();
  const prefix =
    kind === 'primary' ? `ASSAY_${selected.toUpperCase()}` : 'ASSAY_FALLBACK';

  // The AI_EXPLAIN_* aliases only stand in for the default primary block.
  const aliases: string[] =
    kind === 'fallback'
      ? ['AI_FALLBACK']
      : selected === 'primary'
        ? ['AI_EXPLAIN']
        : [];

  const baseUrl = env(`${prefix}_BASE_URL`, ...aliases.map((a) => `${a}_BASE_URL`));
  const apiKey = env(`${prefix}_API_KEY`, ...aliases.map((a) => `${a}_API_KEY`));
  const model = env(`${prefix}_MODEL`, ...aliases.map((a) => `${a}_MODEL`));

  if (!baseUrl || !apiKey || !model) return null;
  return { baseUrl, apiKey, model };
}

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function isRetryable(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    return error.status === undefined || RETRYABLE_STATUS.has(error.status);
  }
  return true; // network-level failures
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class LlmClient {
  private readonly primary: ProviderConfig;
  private readonly fallback: ProviderConfig | null;
  private readonly allowFallback: boolean;
  private readonly temperature: number;
  private readonly maxTokens: number;
  private readonly traceDir?: string;
  private readonly actor: string;

  private callIndex = 0;

  /** Every model that has served a call through this client. */
  readonly modelsSeen = new Set<string>();
  totalPromptTokens = 0;
  totalCompletionTokens = 0;

  constructor(options: ClientOptions = {}) {
    const selected = providerName();
    const primary = readProvider('primary');
    if (!primary) {
      const prefix = `ASSAY_${selected.toUpperCase()}`;
      throw new MissingCredentialsError(
        `no model configured for provider "${selected}" — set ${prefix}_BASE_URL, ` +
          `${prefix}_API_KEY and ${prefix}_MODEL in .env (see .env.example)`
      );
    }

    this.primary = primary;
    this.fallback = readProvider('fallback');
    this.allowFallback = env('ASSAY_ALLOW_FALLBACK') === '1';

    // Some models refuse temperature 0 — Kimi K3 accepts only 1 — so sampling settings are
    // overridable per provider. A model that cannot be run at temperature 0 cannot be run
    // deterministically, which is a reproducibility fact about that model and is reported as one.
    const scope = `ASSAY_${selected.toUpperCase()}`;
    this.temperature = Number(env(`${scope}_TEMPERATURE`, 'ASSAY_TEMPERATURE') ?? '0');
    this.maxTokens = Number(env(`${scope}_MAX_TOKENS`, 'ASSAY_MAX_TOKENS') ?? '4096');
    this.traceDir = options.traceDir;
    this.actor = options.actor ?? 'unknown';

    if (this.traceDir) mkdirSync(this.traceDir, { recursive: true });
  }

  /** Safe to log — contains no secrets. */
  describe(): Record<string, string | boolean> {
    return {
      provider: providerName(),
      primaryModel: this.primary.model,
      primaryBaseUrl: this.primary.baseUrl,
      fallbackModel: this.fallback?.model ?? 'none',
      fallbackEnabled: this.allowFallback && this.fallback !== null,
      temperature: String(this.temperature),
      maxTokens: String(this.maxTokens)
    };
  }

  private async callProvider(
    provider: ProviderConfig,
    messages: ChatMessage[]
  ): Promise<{ text: string; model: string; promptTokens: number; completionTokens: number }> {
    const client = new OpenAI({ apiKey: provider.apiKey, baseURL: provider.baseUrl });
    const response = await client.chat.completions.create({
      model: provider.model,
      messages,
      temperature: this.temperature,
      max_tokens: this.maxTokens
    });

    const text = response.choices[0]?.message?.content ?? '';
    return {
      text,
      model: response.model || provider.model,
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0
    };
  }

  async complete(messages: ChatMessage[], label = 'call'): Promise<CompletionResult> {
    const started = Date.now();
    let attempts = 0;
    let lastError: unknown;

    for (const [index, provider] of [this.primary, this.fallback].entries()) {
      if (!provider) continue;
      const isFallback = index === 1;
      if (isFallback && !this.allowFallback) break;

      for (let retry = 0; retry < 3; retry += 1) {
        attempts += 1;
        try {
          const outcome = await this.callProvider(provider, messages);
          const result: CompletionResult = {
            ...outcome,
            requestedModel: provider.model,
            usedFallback: isFallback,
            latencyMs: Date.now() - started,
            attempts
          };

          this.modelsSeen.add(result.model);
          this.totalPromptTokens += result.promptTokens;
          this.totalCompletionTokens += result.completionTokens;
          this.trace(label, messages, result, null);
          return result;
        } catch (error) {
          lastError = error;
          if (!isRetryable(error)) break;
          await sleep(500 * 2 ** retry);
        }
      }
    }

    this.trace(label, messages, null, lastError);
    throw new Error(
      `model call "${label}" failed after ${attempts} attempt(s): ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }

  /**
   * One file per call: the exact prompt, the exact reply, the model that served it and what it
   * cost. These are the runtime agent trajectories, and they are also what replay mode reads back
   * so the headline result can be reproduced with no provider access at all.
   */
  private trace(
    label: string,
    messages: ChatMessage[],
    result: CompletionResult | null,
    error: unknown
  ): void {
    if (!this.traceDir) return;
    this.callIndex += 1;
    const name = `${String(this.callIndex).padStart(3, '0')}-${label.replace(/[^a-z0-9-]+/gi, '-')}.json`;
    writeFileSync(
      join(this.traceDir, name),
      `${JSON.stringify(
        {
          actor: this.actor,
          label,
          at: new Date().toISOString(),
          request: { messages, temperature: this.temperature, maxTokens: this.maxTokens },
          response: result,
          error: error ? (error instanceof Error ? error.message : String(error)) : null
        },
        null,
        2
      )}\n`
    );
  }
}
