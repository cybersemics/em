/**
 * Launch a single shared Chrome with a CDP remote-debugging endpoint that BOTH the chrome-devtools MCP
 * (configured with `--browser-url=http://127.0.0.1:9222`) and the web executor bridge
 * (`src/e2e/puppeteer/agents.ts`, via `puppeteer.connect`) attach to — so the agent and the bridge drive one
 * browser. Uses puppeteer's managed Chrome so it's identical on local and the CI runner.
 *
 * Run before starting the agent / Claude Code (the chrome-devtools MCP with `--browser-url` will NOT
 * launch Chrome itself — it expects this to be already running):
 *
 *   node scripts/shared-chrome.mjs            # headless (default)
 *   EM_CHROME_HEADLESS=0 node scripts/shared-chrome.mjs   # headed, for watching locally
 */
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer'

const port = process.env.EM_CHROME_PORT || '9222'
const executablePath = puppeteer.executablePath()
const args = [
  `--remote-debugging-port=${port}`,
  '--user-data-dir=/tmp/em-chrome-shared',
  '--no-first-run',
  '--no-default-browser-check',
  ...(process.env.EM_CHROME_HEADLESS === '0' ? [] : ['--headless=new']),
  // Chrome's sandbox needs unprivileged user namespaces, which CI runners (Ubuntu 23.10+ / current
  // GitHub Actions images) disable via an AppArmor policy — Chrome then aborts on launch with
  // "No usable sandbox". Disable the sandbox on Linux only: the runner is an ephemeral, single-tenant
  // VM loading only our own dev server. This is independent of headless/Xvfb (the crash happens headed
  // too). `--disable-dev-shm-usage` avoids separate crashes from the small /dev/shm in CI containers.
  // macOS keeps its sandbox. Override with EM_CHROME_NO_SANDBOX=0.
  ...(process.platform === 'linux' && process.env.EM_CHROME_NO_SANDBOX !== '0'
    ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    : []),
]

console.info(`Launching shared Chrome on :${port}\n  ${executablePath} ${args.join(' ')}`)

const chrome = spawn(executablePath, args, { stdio: 'inherit' })
chrome.on('exit', code => process.exit(code ?? 0))
