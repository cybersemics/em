import {
  createTreecrdtLocalWriteOptions,
  isTreecrdtLocalMaterialization,
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

it('identifies only this tab local TreeCRDT materialization events', () => {
  const first = createTreecrdtLocalWriteOptions()
  const second = createTreecrdtLocalWriteOptions()

  expect(first.writeId).toBeDefined()
  expect(second.writeId).toBeDefined()
  expect(second.writeId).not.toBe(first.writeId)

  expect(
    isTreecrdtLocalMaterialization({
      headSeq: 1,
      changes: [{ kind: 'payload', node: 'local-a', payload: null, source: { writeIds: [first.writeId!] } }],
    }),
  ).toBe(true)
  expect(
    isTreecrdtLocalMaterialization({
      headSeq: 1,
      changes: [{ kind: 'payload', node: 'remote-a', payload: null, source: { writeIds: ['remote-write'] } }],
    }),
  ).toBe(false)
  expect(
    isTreecrdtLocalMaterialization({
      headSeq: 1,
      changes: [],
    }),
  ).toBe(false)
  expect(
    isTreecrdtLocalMaterialization({
      headSeq: 1,
      changes: [{ kind: 'payload', node: 'local-a', payload: null }],
    }),
  ).toBe(false)
  expect(
    isTreecrdtLocalMaterialization({
      headSeq: 1,
      changes: [{ kind: 'payload', node: 'remote-a', payload: null }],
    }),
  ).toBe(false)
})
