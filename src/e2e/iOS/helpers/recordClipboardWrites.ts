/** A single write to the system clipboard, and whether the platform accepted it. */
interface ClipboardWrite {
  /** Content by MIME type. */
  contents: Record<string, string>
  /** WebKit refuses a write made outside the task of the gesture that triggered it. */
  accepted: boolean
  error?: string
}

/**
 * Begin recording what the app writes to the system clipboard, returning a function that reads back the
 * writes made since.
 *
 * The recorder passes each write through to the real clipboard, so `accepted` reports the platform's own
 * verdict rather than a stubbed one. Reading the pasteboard back instead is not an option on iOS: Safari
 * answers `navigator.clipboard.read()` with a native paste confirmation that no automated tap can satisfy.
 *
 * Uses the global `browser` object from WDIO.
 */
const recordClipboardWrites = async (): Promise<() => Promise<ClipboardWrite[]>> => {
  await browser.execute(() => {
    const win = window as typeof window & { __clipboardWrites?: string[] }
    win.__clipboardWrites = []
    const write = navigator.clipboard.write.bind(navigator.clipboard)
    navigator.clipboard.write = (items: ClipboardItem[]) => {
      // Called first and synchronously, so the write stays inside the gesture that WebKit requires.
      const result = write(items)
      const index = win.__clipboardWrites!.length
      win.__clipboardWrites!.push(JSON.stringify({ contents: {}, accepted: false, error: 'pending' }))
      Promise.all(
        items.map(async item => {
          const contents: Record<string, string> = {}
          for (const type of item.types) contents[type] = await (await item.getType(type)).text()
          return contents
        }),
      ).then(async ([contents]) => {
        const record = await result.then(
          () => ({ contents, accepted: true }),
          (e: Error) => ({ contents, accepted: false, error: `${e.name}: ${e.message}` }),
        )
        win.__clipboardWrites![index] = JSON.stringify(record)
      })
      return result
    }
  })

  return async () => {
    await browser.waitUntil(
      () =>
        browser.execute(() => {
          const writes = (window as typeof window & { __clipboardWrites?: string[] }).__clipboardWrites ?? []
          return writes.length > 0 && !writes.some(write => write.includes('"error":"pending"'))
        }),
      { timeout: 10000, interval: 250, timeoutMsg: 'the app made no clipboard write' },
    )
    const raw = await browser.execute(
      () => (window as typeof window & { __clipboardWrites?: string[] }).__clipboardWrites!,
    )
    return raw.map(write => JSON.parse(write) as ClipboardWrite)
  }
}

export default recordClipboardWrites
export type { ClipboardWrite }
