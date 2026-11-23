/*
 * TEMPORARY, with CommandUniverseGlassDebugPanel. Shares the Command Universe glass dials between every browser
 * connected to this dev server, the way the Command Universe map's design sync does (commandUniverseMapSync on the
 * cu-map branches). It rides on Vite's HMR websocket, so it needs no extra server or port and works over whatever URL a
 * device loaded the page from.
 *
 * The overrides are also kept on disk, so a device that connects after a restart still gets them, and so the last
 * tuned values can be read back from the file when they are baked. Dev server only.
 */
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

/** Custom property name to its value without a unit. */
type Overrides = Record<string, number | string>

/** One device's change: a value set, or cleared with null. */
interface DialChange {
  from: string
  changes: Record<string, number | string | null>
}

/**
 * The flush of every running server. Vite restarts the server in the same process when its config changes, so the
 * exit handlers are installed once per process and flush whichever servers are current.
 */
const registry = globalThis as typeof globalThis & {
  cuGlassDialsFlushers?: Set<() => void>
  cuGlassDialsSignals?: boolean
}
const flushers = (registry.cuGlassDialsFlushers ??= new Set<() => void>())

/** Flushes pending writes before Ctrl-C (SIGINT) or a closed terminal (SIGHUP) ends the process. */
const exitOnSignals = () => {
  if (registry.cuGlassDialsSignals) return
  registry.cuGlassDialsSignals = true
  for (const signal of ['SIGINT', 'SIGHUP'] as const) {
    process.once(signal, () => {
      flushers.forEach(flush => flush())
      process.exit(128 + (signal === 'SIGINT' ? 2 : 1))
    })
  }
}

/** Vite plugin that relays and persists the Command Universe glass dials. */
const commandUniverseGlassDialsSync = (file = 'src/components/dialog/commandUniverseGlassDials.json'): Plugin => ({
  name: 'command-universe-glass-dials-sync',
  apply: 'serve',
  configureServer(server) {
    const target = path.resolve(server.config.root, file)

    let overrides: Overrides = {}
    try {
      overrides = (JSON.parse(fs.readFileSync(target, 'utf8')) as { overrides?: Overrides }).overrides ?? {}
    } catch {
      // No file yet.
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    /** Writes to a temporary file and renames it over the real one, so a kill mid-write cannot leave it half written. */
    const write = () => {
      clearTimeout(timer)
      timer = undefined
      fs.writeFileSync(target + '.tmp', JSON.stringify({ overrides }, null, 2) + '\n')
      fs.renameSync(target + '.tmp', target)
    }
    /** Slider drags publish many times a second; the file only needs the last one. */
    const save = () => {
      clearTimeout(timer)
      timer = setTimeout(write, 400)
    }
    /** Writes a change still waiting on the timer. */
    const flush = () => {
      if (timer) write()
    }
    server.httpServer?.on('close', () => {
      flush()
      flushers.delete(flush)
    })
    flushers.add(flush)
    exitOnSignals()
    // Writing the file must not reload the page.
    server.watcher.unwatch(target)

    server.ws.on('cu-glass-dials:change', (data: DialChange) => {
      Object.entries(data.changes).forEach(([name, value]) => {
        if (value === null) delete overrides[name]
        else overrides[name] = value
      })
      save()
      server.ws.send('cu-glass-dials:change', data)
    })
    server.ws.on('cu-glass-dials:pull', (_data: unknown, client) => {
      client.send('cu-glass-dials:state', overrides)
    })
  },
})

export default commandUniverseGlassDialsSync
