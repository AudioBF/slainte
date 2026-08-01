/**
 * Build web isolado + Playwright para Sprint 2B (agenda / tipos de dia).
 *
 * Uso:
 *   node scripts/qa-sprint2b-e2e.mjs
 *   QA_SKIP_EXPORT=1 node scripts/qa-sprint2b-e2e.mjs
 *
 * Flag day-targets permanece OFF. Sem Supabase/Edge/Gemini.
 */
import { spawn, spawnSync } from 'node:child_process';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(root, 'artifacts', 'qa-sprint-2b');
const port = 4182;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.map': 'application/json',
};

function run(cmd, args, env = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${cmd} ${args.join(' ')}`);
  }
}

function exportIsolated(outDir) {
  const absOut = path.join(root, outDir);
  rmSync(absOut, { recursive: true, force: true });
  mkdirSync(artifacts, { recursive: true });

  const env = {
    EXPO_NO_DOTENV: '1',
    EXPO_PUBLIC_SUPABASE_URL: '',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
    EXPO_PUBLIC_USE_EDGE_MEAL_PLAN: 'false',
    EXPO_PUBLIC_AI_MOCK: 'true',
    EXPO_PUBLIC_GEMINI_API_KEY: '',
    EXPO_PUBLIC_USE_MACRO_CONSISTENCY: '',
    EXPO_PUBLIC_USE_DAY_TARGETS: '',
  };

  rmSync(path.join(root, 'dist'), { recursive: true, force: true });
  run('npx', ['expo', 'export', '--platform', 'web', '--clear'], env);
  run('node', ['scripts/patch-html.mjs'], env);
  renameSync(path.join(root, 'dist'), absOut);

  const entry = readdirSync(path.join(absOut, '_expo', 'static', 'js', 'web')).find(
    (f) => f.startsWith('entry-') && f.endsWith('.js'),
  );
  if (!entry) throw new Error(`entry bundle missing in ${outDir}`);
  const bundle = readFileSync(path.join(absOut, '_expo', 'static', 'js', 'web', entry), 'utf8');
  if (/supabaseUrl:"https:\/\//.test(bundle)) {
    throw new Error(`${outDir} ainda contém URL Supabase de produção — abortando QA.`);
  }
  if (/useDayTargets:\s*!0|useDayTargets:\s*true/.test(bundle)) {
    throw new Error(`${outDir}: USE_DAY_TARGETS parece ON — deve permanecer OFF.`);
  }
  console.log(`[export ${outDir}] day-targets flag OFF OK`);
}

function startStaticServer(dir, serverPort) {
  const abs = path.join(root, dir);
  const server = http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = path.join(abs, urlPath === '/' ? 'index.html' : urlPath);
      if (!filePath.startsWith(abs)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        filePath = path.join(abs, 'index.html');
      }
      if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      createReadStream(filePath).pipe(res);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });
  server.listen(serverPort, '127.0.0.1');
  console.log(`Static server ${dir} → http://127.0.0.1:${serverPort}`);
  return server;
}

function waitForServer(serverPort, ms = 15000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get({ host: '127.0.0.1', port: serverPort, path: '/', timeout: 1000 }, (res) => {
        res.resume();
        resolve(undefined);
      });
      req.on('error', () => {
        if (Date.now() - started > ms) reject(new Error(`Server on ${serverPort} not ready`));
        else setTimeout(tryOnce, 250);
      });
    };
    tryOnce();
  });
}

function runPlaywright() {
  return new Promise((resolve, reject) => {
    waitForServer(port)
      .then(() => {
        const child = spawn('npx', ['playwright', 'test', 'e2e/sprint2b-qa.spec.ts'], {
          cwd: root,
          env: {
            ...process.env,
            QA_PORT: String(port),
            QA_BASE_URL: `http://127.0.0.1:${port}`,
            QA_ARTIFACTS: path.join('artifacts', 'qa-sprint-2b'),
          },
          stdio: 'inherit',
          shell: true,
          windowsHide: true,
        });
        child.on('exit', (code) => {
          if (code === 0) resolve(undefined);
          else reject(new Error(`Playwright Sprint 2B failed (${code})`));
        });
      })
      .catch(reject);
  });
}

async function main() {
  console.log('=== Sprint 2B E2E QA (local, isolated, flag OFF) ===');
  const skipExport = process.env.QA_SKIP_EXPORT === '1';
  if (!skipExport) {
    exportIsolated('dist-qa-sprint2b');
  } else {
    console.log('QA_SKIP_EXPORT=1 — reutilizando dist-qa-sprint2b');
  }

  const server = startStaticServer('dist-qa-sprint2b', port);
  const stop = () => {
    try {
      server.close();
    } catch {}
  };
  process.on('exit', stop);
  process.on('SIGINT', () => {
    stop();
    process.exit(1);
  });

  try {
    await runPlaywright();
    console.log('\nE2E Sprint 2B complete. Artifacts:', artifacts);
  } finally {
    stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
