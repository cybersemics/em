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

it('discards only events entirely attributed to this tab’s cleared generation', () => {
  const first = createTreecrdtLocalWriteOptions('generation:1:old')
  const second = createTreecrdtLocalWriteOptions('generation:2:current')

  expect(
    isStaleTreecrdtMaterialization(
      {
        headSeq: 1,
        changes: [{ kind: 'payload', node: 'local-a', payload: null, source: { writeIds: [first.writeId!] } }],
      },
      2,
    ),
  ).toBe(true)
  expect(
    isStaleTreecrdtMaterialization(
      {
        headSeq: 1,
        changes: [
          { kind: 'payload', node: 'local-a', payload: null, source: { writeIds: [first.writeId!, second.writeId!] } },
        ],
      },
      2,
    ),
  ).toBe(false)
  expect(
    isStaleTreecrdtMaterialization(
      {
        headSeq: 1,
        changes: [],
      },
      2,
    ),
  ).toBe(false)
  expect(
    isStaleTreecrdtMaterialization(
      {
        headSeq: 1,
        changes: [{ kind: 'payload', node: 'local-a', payload: null }],
      },
      2,
    ),
  ).toBe(false)
  expect(
    isStaleTreecrdtMaterialization(
      {
        headSeq: 1,
        changes: [
          {
            kind: 'payload',
            node: 'remote-a',
            payload: null,
            source: { writeIds: ['em-local:another-tab:generation:1:old'] },
          },
        ],
      },
      2,
    ),
  ).toBe(false)
})
