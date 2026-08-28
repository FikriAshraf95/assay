/**
 * Static file server for one fixture variant, as a module so the harness can start and stop it
 * in-process. `serve.ts` is the CLI wrapper Playwright's `webServer` launches.
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8'
};

/**
 * ASSAY_VARIANT_DIR lets the harness point the server at a directory outside fixtures/build — the
 * agent's guard step serves sabotaged copies from results/scratch/.
 */
export function variantDir(variant: string): string {
  return process.env.ASSAY_VARIANT_DIR ?? join(ROOT, 'fixtures', 'build', variant);
}

export function createServerForDir(dir: string): Server {
  if (!existsSync(dir)) {
    throw new Error(`fixture directory not found at ${dir} — run \`npm run fixtures:build\``);
  }

  return createServer((req, res) => {
    const requested = (req.url ?? '/').split('?')[0] ?? '/';
    const relative = normalize(requested === '/' ? 'index.html' : requested.replace(/^\/+/, ''));

    if (relative.startsWith('..')) {
      res.writeHead(403).end('forbidden');
      return;
    }

    const file = join(dir, relative);
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end('not found');
      return;
    }

    res.writeHead(200, {
      'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store'
    });
    createReadStream(file).pipe(res);
  });
}

export interface RunningServer {
  port: number;
  url: string;
  close(): Promise<void>;
}

export function createVariantServer(variant: string): Server {
  return createServerForDir(variantDir(variant));
}

/** Port 0 lets the OS pick a free port, which avoids collisions between concurrent harness runs. */
export function startServerForDir(dir: string, port = 0): Promise<RunningServer> {
  const server = createServerForDir(dir);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        reject(new Error('server did not bind to a TCP port'));
        return;
      }
      resolve({
        port: address.port,
        url: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise<void>((done, fail) => server.close((error) => (error ? fail(error) : done())))
      });
    });
  });
}

export function startVariantServer(variant: string, port = 0): Promise<RunningServer> {
  return startServerForDir(variantDir(variant), port);
}
