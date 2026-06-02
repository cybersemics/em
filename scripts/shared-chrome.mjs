/**
 * Launch a single shared Chrome with a CDP remote-debugging endpoint that BOTH the chrome-devtools MCP
 * (configured with `--browser-url=http://127.0.0.1:9222`) and the web executor bridge
 * (`src/e2e/bridge/web`, via `puppeteer.connect`) attach to — so the agent and the bridge drive one
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
]

// eslint-disable-next-line no-console
console.log(`Launching shared Chrome on :${port}\n  ${executablePath} ${args.join(' ')}`)

const chrome = spawn(executablePath, args, { stdio: 'inherit' })
chrome.on('exit', code => process.exit(code ?? 0))
