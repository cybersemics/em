import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import download from '../download'
import share from '../share'

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
}))

vi.mock('@capacitor/share', () => ({
  Share: {
    canShare: vi.fn(async () => ({ value: true })),
    share: vi.fn(async () => {}),
  },
}))

vi.mock('../download', () => ({
  default: vi.fn(),
}))

const options = {
  text: 'foo',
  title: 'foo',
  filename: 'em-foo.txt',
  mimeType: 'text/plain' as const,
}

describe('share', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    // @ts-expect-error navigator.share is not typed on the test environment
    delete navigator.share
  })

  it('uses the native Capacitor share sheet on a native platform', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)

    await share(options)

    expect(Share.share).toHaveBeenCalledWith({ text: 'foo', title: 'foo', dialogTitle: 'foo' })
    expect(download).not.toHaveBeenCalled()
  })

  it('uses the Web Share API when available in the browser', async () => {
    const navigatorShare = vi.fn(async () => {})
    navigator.share = navigatorShare

    await share(options)

    expect(navigatorShare).toHaveBeenCalledWith({ text: 'foo', title: 'foo' })
    expect(download).not.toHaveBeenCalled()
  })

  it('falls back to downloading a file when no share API is available', async () => {
    await share(options)

    expect(download).toHaveBeenCalledWith('foo', 'em-foo.txt', 'text/plain')
  })

  it('resolves silently when the user cancels the share (AbortError)', async () => {
    const navigatorShare = vi.fn(async () => {
      const err = new Error('Share canceled')
      err.name = 'AbortError'
      throw err
    })
    navigator.share = navigatorShare

    await expect(share(options)).resolves.toBeUndefined()
  })
})
