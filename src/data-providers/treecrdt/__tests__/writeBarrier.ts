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

it('surfaces TreeCRDT write failures when waiting for idle', async () => {
  const err = new Error('write failed')

  await expect(
    withTreecrdtWriteBarrier(async () => {
      throw err
    }),
  ).rejects.toThrow('write failed')

  await expect(waitForTreecrdtWriteBarrier()).rejects.toThrow('write failed')
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

// These pairs depend on their order: the first test leaves a write failure behind without waiting for idle, and the
// second waits for idle as initStore does before its next test. Only the reset that setupTests runs after every test
// stands between the two.
// https://github.com/cybersemics/em/issues/5253
describe('isolation between tests', () => {
  /** Rejects the write left running by the previous test. */
  let failRunningWrite: (err: Error) => void

  it('leave a failed write that nothing waited for', async () => {
    await expect(
      withTreecrdtWriteBarrier(async () => {
        throw new Error('write failed in the previous test')
      }),
    ).rejects.toThrow()
  })

  it('do not throw the previous test failure when waiting for idle', async () => {
    await expect(waitForTreecrdtWriteBarrier()).resolves.toBeUndefined()
  })

  it('leave a write running that will fail', () => {
    withTreecrdtWriteBarrier(
      () =>
        new Promise<void>((resolve, reject) => {
          failRunningWrite = reject
        }),
    ).catch(() => {})
  })

  it('do not throw a failure of a write queued by the previous test', async () => {
    failRunningWrite(new Error('write queued in the previous test failed'))
    await expect(waitForTreecrdtWriteBarrier()).resolves.toBeUndefined()
  })
})
