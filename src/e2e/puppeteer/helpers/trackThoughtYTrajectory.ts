import { page } from '../setup'

export type ThoughtTarget = { thoughtValue: string; occurrence?: number } | { editing: true }

export type ThoughtYTrajectorySample = {
  /** Why this sample was taken (sync, microtask chain, rAF index, resize, layout-shift). */
  phase: string
  top: number
  at: number
}

export type ThoughtYTrajectoryResult = {
  dataPath: string | null
  samples: ThoughtYTrajectorySample[]
  initialTop: number
  finalTop: number
  maxAbsDelta: number
}

type TrackThoughtYTrajectoryOptions = {
  target: ThoughtTarget
  /** Samples taken after each `requestAnimationFrame` (after microtasks). */
  maxFrames?: number
  /** Depth of chained microtask reads to catch layout after React/state flushes in the same frame. */
  microtaskDepth?: number
  mutationWaitTimeoutMs?: number
}

const DEFAULT_MAX_FRAMES = 24
const DEFAULT_MICROTASK_DEPTH = 24

/**
 * Tracks `[aria-label="tree-node"]` screen Y (`getBoundingClientRect().top`) across the full
 * initial-layout window: earliest DOM match (via MutationObserver), many microtask turns,
 * every animation frame, ResizeObserver, and layout-shift entries when supported.
 */
const trackThoughtYTrajectory = async ({
  target,
  maxFrames = DEFAULT_MAX_FRAMES,
  microtaskDepth = DEFAULT_MICROTASK_DEPTH,
  mutationWaitTimeoutMs = 10000,
}: TrackThoughtYTrajectoryOptions): Promise<ThoughtYTrajectoryResult> =>
  page.evaluate(
    async ({
      target: t,
      maxFrames: mf,
      microtaskDepth: mtd,
      mutationWaitTimeoutMs: tw,
    }: {
      target: ThoughtTarget
      maxFrames: number
      microtaskDepth: number
      mutationWaitTimeoutMs: number
    }): Promise<ThoughtYTrajectoryResult> => {
      /* eslint-disable jsdoc/require-jsdoc -- helpers run in the browser context */
      const getNode = (): HTMLElement | null => {
        const editableNodes = Array.from(document.querySelectorAll('[data-editable]')) as HTMLElement[]

        if ('editing' in t) {
          const editingNode = document.querySelector('[data-editing="true"]') as HTMLElement | null
          return editingNode?.closest('[aria-label="tree-node"]') as HTMLElement | null
        }

        const matches = editableNodes.filter(node => (node.textContent || '') === t.thoughtValue)
        const editable = matches[t.occurrence || 0]
        return editable?.closest('[aria-label="tree-node"]') as HTMLElement | null
      }

      const findByDataPath = (dataPath: string | null): HTMLElement | null => {
        if (!dataPath) return getNode()
        for (const el of Array.from(document.querySelectorAll('[aria-label="tree-node"]'))) {
          if (el.getAttribute('data-path') === dataPath) return el as HTMLElement
        }
        return null
      }

      await new Promise<void>((resolve, reject) => {
        if (getNode()) {
          resolve()
          return
        }

        let settled = false
        let timeoutId = 0

        const attemptResolve = (observer: MutationObserver) => {
          if (settled) return
          if (getNode()) {
            settled = true
            window.clearTimeout(timeoutId)
            observer.disconnect()
            resolve()
          }
        }

        const mo = new MutationObserver((_mutations, observer) => {
          attemptResolve(observer)
        })
        mo.observe(document.documentElement, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
        })
        timeoutId = window.setTimeout(() => {
          if (settled) return
          settled = true
          mo.disconnect()
          reject(new Error('Timed out waiting for target thought in DOM'))
        }, tw)
        requestAnimationFrame(() => attemptResolve(mo))
      })

      const samples: ThoughtYTrajectorySample[] = []
      let dataPath: string | null = null

      const pushSample = (phase: string, nodeHint?: HTMLElement | null) => {
        const node = nodeHint ?? findByDataPath(dataPath)
        if (!node) return
        const top = node.getBoundingClientRect().top
        samples.push({ phase, top, at: performance.now() })
      }

      const initialNode = getNode()
      if (!initialNode) {
        throw new Error('Target thought not found for y-trajectory measurement.')
      }

      dataPath = initialNode.getAttribute('data-path')

      pushSample('sync-after-detect', initialNode)

      let chain: Promise<void> = Promise.resolve()
      for (let d = 0; d < mtd; d++) {
        const index = d
        chain = chain.then(() => {
          pushSample(`microtask-${index}`)
        })
      }
      await chain

      const tracked = (): HTMLElement | null => findByDataPath(dataPath)

      const resizeObserver = new ResizeObserver(() => {
        pushSample('resize')
      })
      const first = tracked()
      if (first) {
        resizeObserver.observe(first)
      }

      let perfObserver: PerformanceObserver | null = null
      try {
        perfObserver = new PerformanceObserver(list => {
          const node = tracked()
          if (!node) return
          for (const entry of list.getEntries()) {
            const ls = entry as PerformanceEntry & { sources?: readonly { node: Node | null }[] }
            const sources = ls.sources
            if (!sources?.length) continue
            for (const s of sources) {
              if (s.node && (node === s.node || node.contains(s.node))) {
                pushSample('layout-shift')
                break
              }
            }
          }
        })
        perfObserver.observe({ type: 'layout-shift', buffered: true } as PerformanceObserverInit)
      } catch {
        perfObserver = null
      }

      const baselineTop = samples[0]?.top
      if (baselineTop === undefined) {
        resizeObserver.disconnect()
        perfObserver?.disconnect()
        throw new Error('No y samples recorded.')
      }

      for (let frame = 0; frame < mf; frame++) {
        await new Promise<void>(resolve => {
          requestAnimationFrame(() => resolve())
        })
        const node = tracked()
        if (!node) {
          resizeObserver.disconnect()
          perfObserver?.disconnect()
          throw new Error(`Tracked tree-node was unmounted during sampling (rAF frame ${frame}).`)
        }
        pushSample(`rAF-${frame}`, node)
      }

      resizeObserver.disconnect()
      perfObserver?.disconnect()

      let maxAbsDelta = 0
      for (const s of samples) {
        maxAbsDelta = Math.max(maxAbsDelta, Math.abs(s.top - baselineTop))
      }

      const finalTop = samples[samples.length - 1].top

      return {
        dataPath,
        samples,
        initialTop: baselineTop,
        finalTop,
        maxAbsDelta,
      }
      /* eslint-enable jsdoc/require-jsdoc */
    },
    {
      target,
      maxFrames,
      microtaskDepth,
      mutationWaitTimeoutMs,
    },
  )

export default trackThoughtYTrajectory
