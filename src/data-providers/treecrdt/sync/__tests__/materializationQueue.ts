import { enqueueMaterializedThoughtsToStoreWork, waitForMaterializedThoughtsToStore } from '../materializationQueue'

it('waits for materialization work queued while waiting for idle', async () => {
  const order: string[] = []
  let finishFirst!: () => void

  const first = enqueueMaterializedThoughtsToStoreWork(async () => {
    order.push('first:start')
    await new Promise<void>(resolve => {
      finishFirst = resolve
    })
    order.push('first:end')
  })

  const wait = waitForMaterializedThoughtsToStore().then(() => {
    order.push('idle')
  })

  const second = enqueueMaterializedThoughtsToStoreWork(async () => {
    order.push('second')
  })

  await Promise.resolve()
  finishFirst()
  await Promise.all([first, second, wait])

  expect(order).toEqual(['first:start', 'first:end', 'second', 'idle'])
})

it('surfaces materialization failures when waiting for idle', async () => {
  const err = new Error('materialization failed')

  await expect(
    enqueueMaterializedThoughtsToStoreWork(async () => {
      throw err
    }),
  ).rejects.toThrow('materialization failed')

  await expect(waitForMaterializedThoughtsToStore()).rejects.toThrow('materialization failed')
})

// These pairs depend on their order: the first test leaves a refresh failure behind without waiting for idle, and the
// second waits for idle as initStore does before its next test. Only the reset that setupTests runs after every test
// stands between the two.
// https://github.com/cybersemics/em/issues/5253
describe('isolation between tests', () => {
  /** Rejects the refresh left running by the previous test. */
  let failRunningRefresh: (err: Error) => void

  it('leave a failed refresh that nothing waited for', async () => {
    await expect(
      enqueueMaterializedThoughtsToStoreWork(async () => {
        throw new Error('materialization failed in the previous test')
      }),
    ).rejects.toThrow()
  })

  it('do not throw the previous test failure when waiting for idle', async () => {
    await expect(waitForMaterializedThoughtsToStore()).resolves.toBeUndefined()
  })

  it('leave a refresh running that will fail', () => {
    enqueueMaterializedThoughtsToStoreWork(
      () =>
        new Promise<void>((resolve, reject) => {
          failRunningRefresh = reject
        }),
    ).catch(() => {})
  })

  it('do not throw a failure of a refresh queued by the previous test', async () => {
    failRunningRefresh(new Error('refresh queued in the previous test failed'))
    await expect(waitForMaterializedThoughtsToStore()).resolves.toBeUndefined()
  })
})
