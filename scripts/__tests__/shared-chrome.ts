import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import sharedChromeConfig from '../shared-chrome.mjs'

const platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform')!

/** Overrides process.platform for a single test so the platform-dependent sandbox flags can be exercised on any host. */
const stubPlatform = (platform: NodeJS.Platform) =>
  Object.defineProperty(process, 'platform', { value: platform, configurable: true })

afterEach(() => {
  vi.unstubAllEnvs()
  Object.defineProperty(process, 'platform', platformDescriptor)
})

describe('sharedChromeConfig', () => {
  // Regression test for #4848: puppeteer.executablePath() became async in puppeteer 24+, and the
  // un-awaited Promise was passed to spawn as the executable — so the shared Chrome never launched.
  it('resolves the Chrome executable to an absolute path, not a Promise', async () => {
    const { executablePath } = await sharedChromeConfig()

    expect(typeof executablePath).toBe('string')
    expect(path.isAbsolute(executablePath)).toBe(true)
  })

  it('serves the CDP endpoint on port 9222 by default', async () => {
    const { args, port } = await sharedChromeConfig()

    expect(port).toBe('9222')
    expect(args).toContain('--remote-debugging-port=9222')
  })

  it('serves the CDP endpoint on EM_CHROME_PORT when set', async () => {
    vi.stubEnv('EM_CHROME_PORT', '9333')

    const { args, port } = await sharedChromeConfig()

    expect(port).toBe('9333')
    expect(args).toContain('--remote-debugging-port=9333')
    expect(args).not.toContain('--remote-debugging-port=9222')
  })

  it('launches headless by default', async () => {
    const { args } = await sharedChromeConfig()

    expect(args).toContain('--headless=new')
  })

  it('launches headed when EM_CHROME_HEADLESS=0', async () => {
    vi.stubEnv('EM_CHROME_HEADLESS', '0')

    const { args } = await sharedChromeConfig()

    expect(args).not.toContain('--headless=new')
  })

  it('auto-accepts the dev server’s self-signed certificate', async () => {
    const { args } = await sharedChromeConfig()

    expect(args).toContain('--ignore-certificate-errors')
  })

  it('disables the Chrome sandbox on Linux, where CI runners block unprivileged user namespaces', async () => {
    stubPlatform('linux')

    const { args } = await sharedChromeConfig()

    expect(args).toContain('--no-sandbox')
    expect(args).toContain('--disable-setuid-sandbox')
    expect(args).toContain('--disable-dev-shm-usage')
  })

  it('keeps the Chrome sandbox on Linux when EM_CHROME_NO_SANDBOX=0', async () => {
    stubPlatform('linux')
    vi.stubEnv('EM_CHROME_NO_SANDBOX', '0')

    const { args } = await sharedChromeConfig()

    expect(args).not.toContain('--no-sandbox')
    expect(args).not.toContain('--disable-setuid-sandbox')
    expect(args).not.toContain('--disable-dev-shm-usage')
  })

  it('keeps the Chrome sandbox on macOS', async () => {
    stubPlatform('darwin')

    const { args } = await sharedChromeConfig()

    expect(args).not.toContain('--no-sandbox')
  })
})
