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
  await expect(waitForMaterializedThoughtsToStore()).resolves.toBeUndefined()
})
