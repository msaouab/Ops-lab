/**
 * The image registry the simulated cluster pulls from. An image that isn't
 * listed here fails to pull (ImagePullBackOff), exactly like a typo in a tag.
 *
 * Each image says how its container behaves: the port it listens on, its
 * health path, the environment variables it can't start without, and how much
 * memory it needs (a lower memory limit gets it OOMKilled).
 */

export interface ImageInfo {
  /** Port the process listens on. */
  port?: number;
  /** Path that answers 200 for readiness/liveness probes. */
  health?: string;
  /** Environment variables the process exits without. */
  requires?: string[];
  /** Working set in MiB: a memory limit below this is OOMKilled. */
  memoryMi: number;
  /** What `kubectl logs` prints for a healthy container. */
  log: string[];
  /** What it prints before exiting when a required variable is missing. */
  crash?: (missing: string) => string[];
}

const api = (version: string): ImageInfo => ({
  port: 8000,
  health: '/health',
  requires: ['DATABASE_URL', 'REDIS_URL'],
  memoryMi: 180,
  log: [
    `{"level":"info","msg":"shipit-api ${version} starting","port":8000}`,
    '{"level":"info","msg":"connected to postgres","host":"shipit-db-rw.shop.svc"}',
    '{"level":"info","msg":"connected to redis","url":"redis://redis:6379/0"}',
    '{"level":"info","msg":"GET /health 200 1ms"}',
    '{"level":"info","msg":"POST /api/orders 201 34ms"}',
    '{"level":"info","msg":"GET /api/orders/1842 200 9ms"}',
  ],
  crash: missing => [
    `{"level":"info","msg":"shipit-api ${version} starting","port":8000}`,
    `{"level":"fatal","msg":"config error: ${missing} is not set"}`,
  ],
});

const web = (version: string): ImageInfo => ({
  port: 3000,
  health: '/',
  memoryMi: 120,
  log: [
    `  ▲ Next.js 16.2.1 (shipit-web ${version})`,
    '  - Local:        http://localhost:3000',
    '  ✓ Ready in 412ms',
  ],
});

const worker = (version: string): ImageInfo => ({
  requires: ['REDIS_URL'],
  memoryMi: 220,
  log: [
    `worker ${version}: listening on queue "orders"`,
    'worker: job 9311 send-receipt done in 120ms',
    'worker: job 9312 resize-image done in 860ms',
  ],
  crash: missing => [`worker ${version}: starting`, `Error: ${missing} is required`, '    at loadConfig (/app/dist/config.js:14:11)'],
});

export const REGISTRY: Record<string, ImageInfo> = {
  'ghcr.io/msaouab/shipit-api:1.3.0': api('1.3.0'),
  'ghcr.io/msaouab/shipit-api:1.3.2': api('1.3.2'),
  'ghcr.io/msaouab/shipit-api:1.4.0': api('1.4.0'),
  'ghcr.io/msaouab/shipit-api:1.5.0': api('1.5.0'),
  'ghcr.io/msaouab/shipit-web:2.0.0': web('2.0.0'),
  'ghcr.io/msaouab/shipit-web:2.1.0': web('2.1.0'),
  'ghcr.io/msaouab/shipit-web:2.2.0': web('2.2.0'),
  'ghcr.io/msaouab/shipit-worker:1.4.0': worker('1.4.0'),
  'ghcr.io/msaouab/shipit-worker:1.5.0': worker('1.5.0'),
  'redis:7.4': { port: 6379, memoryMi: 40, log: ['1:M 21 Oct 2026 09:00:01.002 * Ready to accept connections tcp'] },
  'nginx:1.27': { port: 80, health: '/', memoryMi: 20, log: ['/docker-entrypoint.sh: Configuration complete; ready for start up'] },
  'nginx:1.29': { port: 80, health: '/', memoryMi: 20, log: ['/docker-entrypoint.sh: Configuration complete; ready for start up'] },
  'nginx:latest': { port: 80, health: '/', memoryMi: 20, log: ['/docker-entrypoint.sh: Configuration complete; ready for start up'] },
  'postgres:17': {
    port: 5432,
    requires: ['POSTGRES_PASSWORD'],
    memoryMi: 90,
    log: ['LOG:  database system is ready to accept connections'],
    crash: () => ['Error: Database is uninitialized and superuser password is not specified.', '       You must specify POSTGRES_PASSWORD to a non-empty value for the superuser.'],
  },
  'traefik/whoami:v1.11': { port: 80, health: '/', memoryMi: 10, log: ['Starting up on port 80'] },
  'prom/prometheus:v3.5.0': { port: 9090, health: '/-/ready', memoryMi: 300, log: ['ts=2026-10-16T09:00:02Z level=info msg="Server is ready to receive web requests."'] },
  'grafana/grafana:12.1.0': { port: 3000, health: '/api/health', memoryMi: 150, log: ['logger=http.server t=2026-10-16T09:00:03Z level=info msg="HTTP Server Listen" address=[::]:3000'] },
  'rancher/mirrored-coredns-coredns:1.12.3': { port: 53, memoryMi: 30, log: ['.:53', 'CoreDNS-1.12.3'] },
  'rancher/mirrored-metrics-server:v0.8.0': { port: 10250, memoryMi: 40, log: ['I1016 09:00:04.000000 1 secure_serving.go:213] Serving securely on [::]:10250'] },
  'rancher/local-path-provisioner:v0.0.32': { memoryMi: 20, log: ['time="2026-10-16T09:00:02Z" level=info msg="Provisioner started"'] },
};

/** Docker Hub images can be written without a registry or with "docker.io/library/". */
export function lookupImage(image: string): ImageInfo | undefined {
  const short = image.replace(/^docker\.io\/(library\/)?/, '');
  return REGISTRY[short];
}

/** Tags available for an image name, for error messages and hints. */
export function tagsOf(name: string): string[] {
  return Object.keys(REGISTRY).filter(k => k.slice(0, k.lastIndexOf(':')) === name).map(k => k.slice(k.lastIndexOf(':') + 1));
}
