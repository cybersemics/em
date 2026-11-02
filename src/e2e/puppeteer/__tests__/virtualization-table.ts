import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

it('keeps the widest table col1 thought mounted once it scrolls above the virtualization cutoff', async () => {
  const widest = 'the widest thought in column one'
  // Short col1 thoughts above the widest one, each with a col2 long enough to wrap more when col1 is wider.
  const rows = Array.from(
    { length: 12 },
    (_, index) =>
      `      - k${index + 1}\n        - lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore`,
  ).join('\n')

  await paste(`
    - Day
      - =view
        - Table
${rows}
      - ${widest}
        - lorem ipsum dolor sit amet
      - k13
        - lorem ipsum dolor sit amet
  `)
  // With the cursor on the table, its rows are below the cursor and are virtualized when they are below the viewport.
  await clickThought('Day')
  await waitForEditable('k1')

  // Scroll down a few pixels per frame and stop on the first frame that the widest thought is mounted, i.e. right at the virtualization cutoff.
  await page.evaluate(
    (value: string) =>
      new Promise<void>((resolve, reject) => {
        /** Scrolls down until the widest thought is mounted. */
        const step = () => {
          if (Array.from(document.querySelectorAll('[data-editable]')).some(element => element.textContent === value)) {
            resolve()
          } else if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight) {
            reject(new Error(`Scrolled to the bottom without mounting "${value}".`))
          } else {
            window.scrollBy(0, 5)
            requestAnimationFrame(step)
          }
        }
        requestAnimationFrame(step)
      }),
    widest,
  )

  // Without scrolling any further, record every time the widest thought is mounted or unmounted over the next second.
  const transitions = await page.evaluate(
    (value: string) =>
      new Promise<string[]>(resolve => {
        const result: string[] = []
        /** Returns true if the widest thought is rendered. */
        const isMounted = () =>
          Array.from(document.querySelectorAll('[data-editable]')).some(element => element.textContent === value)
        let mounted = isMounted()
        const observer = new MutationObserver(() => {
          if (isMounted() !== mounted) {
            mounted = !mounted
            result.push(mounted ? 'mount' : 'unmount')
          }
        })
        observer.observe(document.body, { childList: true, subtree: true })
        setTimeout(() => {
          observer.disconnect()
          resolve(result)
        }, 1000)
      }),
    widest,
  )

  expect(transitions).toEqual([])
})

it('keeps the table col1 width after its widest thought is virtualized', async () => {
  const widest = 'the widest thought in column one'
  const rows = Array.from(
    { length: 60 },
    (_, index) =>
      `      - k${index + 1}\n        - v${index + 1} lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore`,
  ).join('\n')

  await paste(`
    - Day
      - =view
        - Table
${rows}
      - ${widest}
        - lorem ipsum dolor sit amet
  `)
  await clickThought('Day')
  await waitForEditable('k1')

  /** Waits until the left edge of the col2 thought v1 is unchanged for 3 consecutive animation frames, then returns it. Col2 starts where col1 ends, so this tracks the col1 width. */
  const waitForCol2Left = () =>
    page.evaluate(
      () =>
        new Promise<number>((resolve, reject) => {
          const start = performance.now()
          let leftPrevious: number | null = null
          let stableFrames = 0
          /** Measures v1 on the next animation frame. */
          const measure = () => {
            const editable = Array.from(document.querySelectorAll('[data-editable]')).find(element =>
              element.textContent?.startsWith('v1 '),
            )
            if (!editable) {
              reject(new Error('v1 is not rendered.'))
              return
            }
            const left = editable.getBoundingClientRect().left
            stableFrames = left === leftPrevious ? stableFrames + 1 : 0
            leftPrevious = left
            if (stableFrames === 3) {
              resolve(left)
            } else if (performance.now() - start > 8000) {
              reject(new Error(`v1 did not settle within 8000ms (last left: ${left}px).`))
            } else {
              requestAnimationFrame(measure)
            }
          }
          requestAnimationFrame(measure)
        }),
    )

  // Scroll down until the widest thought is rendered, then wait for col1 to settle at its full width.
  await page.evaluate(
    (value: string) =>
      new Promise<void>((resolve, reject) => {
        /** Scrolls down until the widest thought is rendered. */
        const step = () => {
          if (Array.from(document.querySelectorAll('[data-editable]')).some(element => element.textContent === value)) {
            resolve()
          } else if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight) {
            reject(new Error(`Scrolled to the bottom without rendering "${value}".`))
          } else {
            window.scrollBy(0, 300)
            requestAnimationFrame(step)
          }
        }
        requestAnimationFrame(step)
      }),
    widest,
  )

  const leftWhileRendered = await waitForCol2Left()

  // Scroll back to the top so that the widest thought is virtualized again.
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForFunction(
    (value: string) =>
      !Array.from(document.querySelectorAll('[data-editable]')).some(element => element.textContent === value),
    {},
    widest,
  )
  const leftAfterVirtualized = await waitForCol2Left()

  expect(leftAfterVirtualized).toBe(leftWhileRendered)
})
