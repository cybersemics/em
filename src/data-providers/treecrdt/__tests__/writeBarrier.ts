import {
  createTreecrdtLocalWriteOptions,
  isStaleTreecrdtMaterialization,
  waitForTreecrdtWriteBarrier,
  withTreecrdtWriteBarrier,
} from '../writeBarrier'

it('waits for TreeCRDT writes queued while waiting for idle', async () => {
  const order: string[] = []
  let finishFirst!: () => void

  const first = withTreecrdtWriteBarrier(async () => {
    order.push('first:start')
    await new Promise<void>(resolve => {
      finishFirst = resolve
    })
    order.push('first:end')
  })

  const wait = waitForTreecrdtWriteBarrier().then(() => {
    order.push('idle')
  })

  const second = withTreecrdtWriteBarrier(async () => {
    order.push('second')
  })

  await Promise.resolve()
  finishFirst()
  await Promise.all([first, second, wait])

  expect(order).toEqual(['first:start', 'first:end', 'second', 'idle'])
})

it('surfaces TreeCRDT write failures when waiting for idle', async () => {
  const err = new Error('write failed')

  await expect(
    withTreecrdtWriteBarrier(async () => {
      throw err
    }),
  ).rejects.toThrow('write failed')

  await expect(waitForTreecrdtWriteBarrier()).rejects.toThrow('write failed')
  await expect(waitForTreecrdtWriteBarrier()).resolves.toBeUndefined()
})

const oldWriteId = createTreecrdtLocalWriteOptions('generation:1:old').writeId!
const currentWriteId = createTreecrdtLocalWriteOptions('generation:2:current').writeId!
const change = { kind: 'payload' as const, node: 'a', payload: null }

it.each([
  {
    name: 'old local generation',
    changes: [{ ...change, source: { writeIds: [oldWriteId] } }],
    stale: true,
  },
  {
    name: 'mixed old and current local generations',
    changes: [{ ...change, source: { writeIds: [oldWriteId, currentWriteId] } }],
    stale: false,
  },
  { name: 'empty event', changes: [], stale: false },
  { name: 'unattributed change', changes: [change], stale: false },
  {
    name: 'another tab',
    changes: [{ ...change, source: { writeIds: ['em-local:another-tab:generation:1:old'] } }],
    stale: false,
  },
])('detects stale materialization: $name', ({ changes, stale }) => {
  expect(isStaleTreecrdtMaterialization({ headSeq: 1, changes }, 2)).toBe(stale)
})
