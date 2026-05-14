import {
  isTreecrdtLocalWriteInProgress,
  waitForTreecrdtWriteBarrier,
  withTreecrdtLocalWrite,
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

it('marks only the current async scope as a local TreeCRDT write', async () => {
  expect(isTreecrdtLocalWriteInProgress()).toBe(false)

  await withTreecrdtLocalWrite(async () => {
    expect(isTreecrdtLocalWriteInProgress()).toBe(true)
    await Promise.resolve()
    expect(isTreecrdtLocalWriteInProgress()).toBe(true)
  })

  expect(isTreecrdtLocalWriteInProgress()).toBe(false)
})

it('clears the local write marker after a failed TreeCRDT write', async () => {
  await expect(
    withTreecrdtLocalWrite(async () => {
      throw new Error('write failed')
    }),
  ).rejects.toThrow('write failed')

  expect(isTreecrdtLocalWriteInProgress()).toBe(false)
})
