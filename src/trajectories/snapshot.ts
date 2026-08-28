/**
 * Snapshots the build-time agent trajectory into the repository.
 *
 * The submission requires trajectories for *every* agent used, and the agent that wrote this project
 * is Claude Code — its transcript is the evidence. Claude Code stores sessions as JSONL under
 * ~/.claude/projects/<slug>/, which is outside the repo, live, and not readable by a human. This
 * script copies them in, renders a followable Markdown version alongside the raw file, and redacts
 * credentials on the way.
 *
 * Redaction fails closed: if anything key-shaped survives the pass, the script aborts without
 * writing rather than shipping a secret into a public repository.
 *
 *   npm run trajectories:snapshot
 *
 * Override discovery with ASSAY_TRANSCRIPT_DIR if the session store lives elsewhere.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT_DIR = join(ROOT, 'trajectories', 'build-agent');

const THINKING_LIMIT = 2_000;
const TOOL_INPUT_LIMIT = 1_200;
const TOOL_RESULT_LIMIT = 800;
const TEXT_LIMIT = 6_000;

/* ------------------------------------------------------------------------------------------- *
 * Redaction
 * ------------------------------------------------------------------------------------------- */

const HOME = homedir();

const REDACTIONS: { label: string; pattern: RegExp; replacement: string }[] = [
  { label: 'anthropic key', pattern: /sk-ant-[A-Za-z0-9_-]{16,}/g, replacement: '[REDACTED_ANTHROPIC_KEY]' },
  { label: 'openai key', pattern: /sk-(?:proj-)?[A-Za-z0-9]{32,}/g, replacement: '[REDACTED_API_KEY]' },
  { label: 'github token', pattern: /gh[pousr]_[A-Za-z0-9]{20,}/g, replacement: '[REDACTED_GITHUB_TOKEN]' },
  { label: 'github pat', pattern: /github_pat_[A-Za-z0-9_]{20,}/g, replacement: '[REDACTED_GITHUB_TOKEN]' },
  { label: 'aws key id', pattern: /AKIA[0-9A-Z]{16}/g, replacement: '[REDACTED_AWS_KEY]' },
  { label: 'bearer token', pattern: /Bearer\s+[A-Za-z0-9._-]{24,}/g, replacement: 'Bearer [REDACTED]' },
  { label: 'email', pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replacement: '[REDACTED_EMAIL]' },
  { label: 'home path', pattern: new RegExp(escapeRegExp(HOME).replace(/\\\\/g, '[\\\\/]'), 'gi'), replacement: '<HOME>' }
];

/** Patterns that must not survive redaction. Their presence in output aborts the run. */
const FORBIDDEN: { label: string; pattern: RegExp }[] = [
  { label: 'anthropic key', pattern: /sk-ant-[A-Za-z0-9_-]{16,}/ },
  { label: 'generic sk key', pattern: /sk-[A-Za-z0-9]{32,}/ },
  { label: 'github token', pattern: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  { label: 'aws key id', pattern: /AKIA[0-9A-Z]{16}/ }
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const redactionCounts = new Map<string, number>();

function redact(text: string): string {
  let out = text;
  for (const rule of REDACTIONS) {
    out = out.replace(rule.pattern, () => {
      redactionCounts.set(rule.label, (redactionCounts.get(rule.label) ?? 0) + 1);
      return rule.replacement;
    });
  }
  return out;
}

function assertClean(text: string, source: string): void {
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(text)) {
      throw new Error(
        `refusing to write ${source}: a ${rule.label} survived redaction. ` +
          `Add a pattern to REDACTIONS in src/trajectories/snapshot.ts and re-run.`
      );
    }
  }
}

/* ------------------------------------------------------------------------------------------- *
 * Transcript discovery
 * ------------------------------------------------------------------------------------------- */

/** Claude Code slugifies the project path: `d:\Works\ai\competition` -> `d--Works-ai-competition`. */
function slugify(path: string): string {
  return path.replace(/[^A-Za-z0-9]/g, '-');
}

function findTranscriptDir(): string {
  if (process.env.ASSAY_TRANSCRIPT_DIR) return process.env.ASSAY_TRANSCRIPT_DIR;

  const projects = join(HOME, '.claude', 'projects');
  if (!existsSync(projects)) {
    throw new Error(`no Claude Code session store at ${projects}; set ASSAY_TRANSCRIPT_DIR`);
  }

  // The repo lives one level below the directory Claude Code was launched in.
  for (const candidate of [dirname(ROOT.replace(/[\\/]$/, '')), ROOT.replace(/[\\/]$/, '')]) {
    const dir = join(projects, slugify(candidate));
    if (existsSync(dir)) return dir;
  }

  // Fall back to matching on the cwd recorded inside each transcript.
  const parent = dirname(ROOT.replace(/[\\/]$/, '')).toLowerCase();
  for (const entry of readdirSync(projects, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(projects, entry.name);
    const file = readdirSync(dir).find((name) => name.endsWith('.jsonl'));
    if (!file) continue;
    const first = readFileSync(join(dir, file), 'utf8').split('\n').find(Boolean);
    if (!first) continue;
    try {
      const cwd = String((JSON.parse(first) as { cwd?: string }).cwd ?? '').toLowerCase();
      if (cwd.startsWith(parent)) return dir;
    } catch {
      /* skip unparseable */
    }
  }

  throw new Error(`could not locate transcripts under ${projects}; set ASSAY_TRANSCRIPT_DIR`);
}

/* ------------------------------------------------------------------------------------------- *
 * Rendering
 * ------------------------------------------------------------------------------------------- */

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  name?: string;
  input?: unknown;
  content?: unknown;
  is_error?: boolean;
}

interface Entry {
  type: string;
  timestamp?: string;
  isMeta?: boolean;
  isSidechain?: boolean;
  message?: {
    role?: string;
    model?: string;
    content?: string | ContentBlock[];
    usage?: Record<string, number>;
  };
}

interface Stats {
  human: number;
  assistant: number;
  toolCalls: number;
  toolErrors: number;
  inputTokens: number;
  outputTokens: number;
  toolUse: Map<string, number>;
  model: string;
  start?: string;
  end?: string;
  skipped: number;
}

function clip(text: string, limit: number): string {
  const trimmed = text.trimEnd();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit)}\n… [truncated, ${trimmed.length - limit} more characters]`;
}

function stringifyResult(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        const typed = block as ContentBlock;
        if (typed.type === 'text') return typed.text ?? '';
        return `[${typed.type}]`;
      })
      .join('\n');
  }
  return JSON.stringify(content ?? '', null, 2);
}

function fence(body: string, lang = ''): string {
  const guard = body.includes('```') ? '````' : '```';
  return `${guard}${lang}\n${body}\n${guard}`;
}

function renderSession(entries: Entry[], sessionId: string): { markdown: string; stats: Stats } {
  const stats: Stats = {
    human: 0,
    assistant: 0,
    toolCalls: 0,
    toolErrors: 0,
    inputTokens: 0,
    outputTokens: 0,
    toolUse: new Map(),
    model: 'unknown',
    skipped: 0
  };

  const body: string[] = [];
  let step = 0;

  for (const entry of entries) {
    if (entry.type !== 'user' && entry.type !== 'assistant') continue;
    const when = entry.timestamp ?? '';
    if (when) {
      stats.start ??= when;
      stats.end = when;
    }

    const content = entry.message?.content;

    if (entry.type === 'assistant') {
      stats.assistant += 1;
      if (entry.message?.model) stats.model = entry.message.model;
      stats.inputTokens += entry.message?.usage?.input_tokens ?? 0;
      stats.outputTokens += entry.message?.usage?.output_tokens ?? 0;

      step += 1;
      const parts: string[] = [`## ${step} · Assistant — ${when}`];

      const blocks = Array.isArray(content) ? content : [];
      for (const block of blocks) {
        if (block.type === 'thinking' && block.thinking) {
          parts.push(`<details><summary>Reasoning</summary>\n\n${fence(clip(block.thinking, THINKING_LIMIT))}\n\n</details>`);
        } else if (block.type === 'text' && block.text) {
          parts.push(clip(block.text, TEXT_LIMIT));
        } else if (block.type === 'tool_use') {
          stats.toolCalls += 1;
          const name = block.name ?? 'unknown';
          stats.toolUse.set(name, (stats.toolUse.get(name) ?? 0) + 1);
          parts.push(
            `**→ tool call: \`${name}\`**\n\n` +
              fence(clip(JSON.stringify(block.input ?? {}, null, 2), TOOL_INPUT_LIMIT), 'json')
          );
        }
      }
      body.push(parts.join('\n\n'));
      continue;
    }

    // user entries are either a real human turn or the harness returning tool results
    const blocks = Array.isArray(content) ? content : [];
    const results = blocks.filter((block) => block.type === 'tool_result');

    if (results.length > 0) {
      const parts: string[] = [];
      for (const result of results) {
        if (result.is_error) stats.toolErrors += 1;
        parts.push(
          `**← tool result${result.is_error ? ' (error)' : ''}**\n\n` +
            fence(clip(stringifyResult(result.content), TOOL_RESULT_LIMIT))
        );
      }
      body.push(parts.join('\n\n'));
      continue;
    }

    const text =
      typeof content === 'string'
        ? content
        : blocks
            .filter((block) => block.type === 'text')
            .map((block) => block.text ?? '')
            .join('\n');

    if (!text.trim()) continue;

    if (entry.isMeta) {
      body.push(`> _[harness message]_ ${clip(text, 500).replace(/\n/g, '\n> ')}`);
      continue;
    }

    stats.human += 1;
    step += 1;
    body.push(`## ${step} · Human checkpoint — ${when}\n\n${fence(clip(text, TEXT_LIMIT))}`);
  }

  const toolSummary = [...stats.toolUse.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `\`${name}\` ×${count}`)
    .join(', ');

  const header = [
    `# Build-agent trajectory — \`${sessionId}\``,
    '',
    'The coding agent that built this project, captured from its own session transcript.',
    '',
    `| | |`,
    `| --- | --- |`,
    `| Agent | Claude Code |`,
    `| Model | \`${stats.model}\` |`,
    `| Window | ${stats.start ?? '?'} → ${stats.end ?? '?'} |`,
    `| Human checkpoints | ${stats.human} |`,
    `| Assistant turns | ${stats.assistant} |`,
    `| Tool calls | ${stats.toolCalls} (${stats.toolErrors} returned errors) |`,
    `| Tokens | ${stats.inputTokens.toLocaleString()} in / ${stats.outputTokens.toLocaleString()} out |`,
    `| Tools used | ${toolSummary || '—'} |`,
    '',
    'Reasoning blocks are collapsed and long tool payloads are truncated; the unabridged record is',
    `the sibling \`${sessionId}.jsonl\`. Credentials, emails and home paths are redacted in both.`,
    '',
    '---',
    ''
  ].join('\n');

  return { markdown: header + body.join('\n\n') + '\n', stats };
}

/* ------------------------------------------------------------------------------------------- *
 * Main
 * ------------------------------------------------------------------------------------------- */

function main(): void {
  const source = findTranscriptDir();
  const files = readdirSync(source).filter((name) => name.endsWith('.jsonl'));

  if (files.length === 0) {
    console.error(`no .jsonl transcripts found in ${source}`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const summaries: { id: string; stats: Stats; bytes: number }[] = [];

  for (const file of files) {
    const sessionId = basename(file, '.jsonl');
    const raw = readFileSync(join(source, file), 'utf8');

    const entries: Entry[] = [];
    let skipped = 0;
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        entries.push(JSON.parse(line) as Entry);
      } catch {
        // The live session file can end mid-write; a partial trailing line is expected.
        skipped += 1;
      }
    }

    const { markdown, stats } = renderSession(entries, sessionId);
    stats.skipped = skipped;

    const safeMarkdown = redact(markdown);
    const safeRaw = redact(raw);
    assertClean(safeMarkdown, `${sessionId}.md`);
    assertClean(safeRaw, `${sessionId}.jsonl`);

    writeFileSync(join(OUT_DIR, `${sessionId}.md`), safeMarkdown);
    writeFileSync(join(OUT_DIR, `${sessionId}.jsonl`), safeRaw);

    summaries.push({ id: sessionId, stats, bytes: safeRaw.length });
    console.log(
      `${sessionId}  ${stats.human} checkpoints, ${stats.assistant} turns, ` +
        `${stats.toolCalls} tool calls${skipped ? `, ${skipped} partial lines skipped` : ''}`
    );
  }

  const totals = summaries.reduce(
    (acc, s) => ({
      human: acc.human + s.stats.human,
      turns: acc.turns + s.stats.assistant,
      tools: acc.tools + s.stats.toolCalls,
      input: acc.input + s.stats.inputTokens,
      output: acc.output + s.stats.outputTokens
    }),
    { human: 0, turns: 0, tools: 0, input: 0, output: 0 }
  );

  const index = [
    '# Build-agent trajectories',
    '',
    'Required disclosure of coding-agent use. This project was built with **Claude Code**',
    '(`claude-opus-5`) driving the implementation under human direction. The files here are that',
    "agent's own session transcripts — what it did, how each tool responded, and the human",
    'checkpoints that redirected it.',
    '',
    'Runtime trajectories for the agents *inside* the product — the healer and the baseline — are',
    'recorded separately under `results/traces/` when the evaluation runs.',
    '',
    '## Sessions',
    '',
    '| Session | Human checkpoints | Assistant turns | Tool calls | Tokens (in/out) |',
    '| --- | --- | --- | --- | --- |',
    ...summaries.map(
      (s) =>
        `| [\`${s.id}\`](${s.id}.md) | ${s.stats.human} | ${s.stats.assistant} | ` +
        `${s.stats.toolCalls} | ${s.stats.inputTokens.toLocaleString()} / ${s.stats.outputTokens.toLocaleString()} |`
    ),
    `| **Total** | **${totals.human}** | **${totals.turns}** | **${totals.tools}** | ` +
      `**${totals.input.toLocaleString()} / ${totals.output.toLocaleString()}** |`,
    '',
    '## Reading these',
    '',
    'Each `.md` is a rendered, followable version: human checkpoints, the reasoning behind each',
    'step (collapsed), every tool call with its arguments, and every tool response. The paired',
    '`.jsonl` is the unabridged original in Claude Code session format.',
    '',
    '## Redaction',
    '',
    'API keys, tokens, email addresses and home-directory paths are stripped on the way in. The',
    'snapshotter refuses to write any file in which a key-shaped string survives redaction, so a',
    'credential cannot reach this directory by omission.',
    '',
    `Regenerate with \`npm run trajectories:snapshot\`. Last run: ${new Date().toISOString()}.`,
    ''
  ].join('\n');

  writeFileSync(join(OUT_DIR, 'README.md'), index);

  const redactions = [...redactionCounts.entries()]
    .map(([label, count]) => `${label} ×${count}`)
    .join(', ');
  console.log(`\nredacted: ${redactions || 'nothing matched'}`);
  console.log(`wrote ${summaries.length} session(s) to ${OUT_DIR}`);
}

main();
