import Gesture from '../../../@types/Gesture'
import Key from '../../../@types/Key'
import { page } from '../session'
import refresh from './refresh'

/** The plain data a stub command is built from. Everything passed to stubCommands is serialized into the page, so it cannot hold functions. */
interface StubCommand {
  label: string
  gesture?: Gesture | Gesture[]
  keyboard?: Key | Key[] | string
  description?: string
}

/** The path of the module that exports every registered command. The app reads its command list from this module and nothing else. */
const COMMANDS_MODULE = '/src/commands/index.ts'

/** Rewrites the commands module as served by the dev server, so that it exports the registered commands without their gestures, keyboard shortcuts, or chaining, followed by the stubs. The registered commands stay in the list because the app looks some of them up by id, such as the toolbar buttons. */
const rewriteCommandsModule = (source: string, stubs: StubCommand[]): string => {
  const names: string[] = []

  // Import the registered commands instead of exporting them. Each is bound to a prefixed name, since an export name such as delete may be a reserved word.
  const imports = source.replace(/export\s*\{([^}]*)\}/g, (match, specifiers: string) => {
    const bindings = specifiers
      .split(',')
      .map(specifier => specifier.trim())
      .filter(Boolean)
      .map(specifier => {
        const [imported, name = imported] = specifier.split(/\s+as\s+/)
        names.push(name)
        return `${imported} as __registered_${name}`
      })
    return `import { ${bindings.join(', ')} }`
  })

  if (names.length === 0) {
    throw new Error(`stubCommands found no exports in ${COMMANDS_MODULE}. Has its format changed?`)
  }

  return [
    imports,
    'const unbind = command => ({ ...command, gesture: undefined, keyboard: undefined, isChainable: undefined })',
    ...names.map(name => `const __unbound_${name} = unbind(__registered_${name})`),
    `export { ${names.map(name => `__unbound_${name} as ${name}`).join(', ')} }`,
    // Stubs are hidden from Help, since they belong to no group in COMMAND_DIFFICULTIES.
    ...stubs.map(
      (stub, i) =>
        `export const __stub${i} = { ...${JSON.stringify(stub)}, id: 'stub${i}', hideFromHelp: true, multicursor: false, exec: () => {} }`,
    ),
  ].join('\n')
}

/** Replaces the commands the app lists and matches against gestures and keyboard shortcuts with a fixed list, so that a snapshot of a command list does not change whenever a command is added, removed, or renamed. Reloads the page, so call it before arranging anything else. The app code is unchanged: the commands module is rewritten as the dev server serves it. The registered commands keep working when run by id, and per-test page isolation restores them. */
const stubCommands = async (stubs: StubCommand[]): Promise<void> => {
  const client = await page.createCDPSession()
  let served = false
  /** Rejects the failed promise, set once the promise is created. */
  let fail: (error: unknown) => void = () => {}
  const failed = new Promise<never>((resolve, reject) => {
    fail = reject
  })

  client.on('Fetch.requestPaused', async ({ requestId, responseStatusCode, responseHeaders }) => {
    try {
      const { body, base64Encoded } = await client.send('Fetch.getResponseBody', { requestId })
      const source = base64Encoded ? Buffer.from(body, 'base64').toString() : body
      await client.send('Fetch.fulfillRequest', {
        requestId,
        responseCode: responseStatusCode ?? 200,
        // the body changes length, and must not be revalidated against the original
        responseHeaders: responseHeaders?.filter(header => !/^(content-length|etag)$/i.test(header.name)),
        body: Buffer.from(rewriteCommandsModule(source, stubs)).toString('base64'),
      })
      served = true
    } catch (error) {
      await client.send('Fetch.failRequest', { requestId, errorReason: 'Failed' })
      fail(error)
    }
  })

  await client.send('Fetch.enable', { patterns: [{ urlPattern: `*${COMMANDS_MODULE}*`, requestStage: 'Response' }] })

  // a cached module would be revalidated with an empty 304 response, leaving nothing to rewrite
  await page.setCacheEnabled(false)

  await Promise.race([refresh(), failed])

  if (!served) {
    throw new Error(`stubCommands did not intercept ${COMMANDS_MODULE}. Has it moved?`)
  }
}

export default stubCommands
