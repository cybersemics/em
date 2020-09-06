import { EM_TOKEN, ROOT_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import { getChildren, getThought } from '../../selectors'
import * as firebase from '../firebase'
import _ from 'lodash'
import { hashContext, hashThought, never, timestamp } from '../../util'
import { GenericObject } from '../../utilTypes'

jest.useFakeTimers()

interface Snapshot {
  val: () => any,
}

// mock firebase object store
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      firebaseStore: GenericObject<any>,
    }
  }
}
global.firebaseStore = {}

// mock user authentication
jest.mock('../../store', () => {

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _ = require('lodash')

  return {
    store: {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      dispatch: () => {},
      getState: () => ({
        user: {
          uid: 12345
        },
        // mock userRef with update function that sets arbitrary data on the mock firebase store
        userRef: {
          update: (updates: GenericObject<any>, cb: (err: Error | null, ...args: any[]) => void) => {
            Object.entries(updates).forEach(([key, value]) => {
              _.set(global.firebaseStore, 'users/12345/' + key, value)
            })
            cb(null)
          }
        }
      })
    }
  }
})

/** Returns a snapshot that returns the given value. */
const wrapSnapshot = (val: any): Snapshot => ({
  val: () => val
})

// mock window.firebase
window.firebase = {
  database: () => ({
    ref: (path: string) => ({

      children: (keys: string[]) => {
        return {
          once: (name: string, cb: (snapshot: Snapshot) => void) => {
            cb(wrapSnapshot(keys.map(key => _.get(global.firebaseStore, `${path}/${key}`))))
          }
        }
      },

      once: (name: string, cb: (snapshot: Snapshot) => void) => {
        cb(wrapSnapshot(_.get(global.firebaseStore, path)))
      }

    })
  })
}

afterEach(() => {
  global.firebaseStore = {}
})

test('getThoughtById', async () => {

  const nothought = await firebase.getThoughtById('12345')
  expect(nothought).toBeUndefined()

  const thought = {
    id: '12345',
    value: 'x',
    rank: 0,
    contexts: [],
    created: timestamp(),
    lastUpdated: timestamp()
  }

  await firebase.updateThought('12345', thought)

  const dbThought = await firebase.getThoughtById('12345')
  expect(dbThought).toEqual(thought)

})

test('getThoughtsByIds', async () => {

  const thoughtX = {
    id: hashThought('x'),
    value: 'x',
    rank: 0,
    contexts: [{
      context: ['a'],
      rank: 0,
      lastUpdated: timestamp(),
    }],
    created: timestamp(),
    lastUpdated: timestamp()
  }

  const thoughtY = {
    id: hashThought('y'),
    value: 'y',
    rank: 0,
    contexts: [{
      context: ['b'],
      rank: 0,
      lastUpdated: timestamp(),
    }],
    created: timestamp(),
    lastUpdated: timestamp()
  }

  await firebase.updateThought(hashThought('x'), thoughtX)
  await firebase.updateThought(hashThought('y'), thoughtY)

  const dbThoughts = await firebase.getThoughtsByIds([hashThought('x'), hashThought('y')])

  // does not preserve order
  expect(dbThoughts).toEqual(
    expect.arrayContaining([thoughtX, thoughtY])
  )
})

test('updateThought', async () => {

  const nothought = await firebase.getThought('x')
  expect(nothought).toBeUndefined()

  const thought = {
    id: hashThought('x'),
    value: 'x',
    rank: 0,
    contexts: [],
    created: timestamp(),
    lastUpdated: timestamp()
  }

  await firebase.updateThought(thought.id, thought)

  const remoteThought = await firebase.getThought('x')
  expect(remoteThought).toEqual(thought)
})

test('getContext', async () => {

  const nocontext = await firebase.getContext(['x'])
  expect(nocontext).toBeUndefined()

  const parentEntry = {
    id: hashContext(['x']),
    children: [
      { value: 'a', rank: 0 },
      { value: 'b', rank: 1 },
      { value: 'c', rank: 2 },
    ],
    lastUpdated: timestamp()
  }

  await firebase.updateContext(hashContext(['x']), parentEntry)

  const dbContext = await firebase.getContext(['x'])
  expect(dbContext).toEqual({
    ...parentEntry,
    id: hashContext(['x']),
  })
})

test('updateThoughtIndex', async () => {

  const thoughtX = {
    id: hashThought('x'),
    value: 'x',
    rank: 0,
    contexts: [],
    created: timestamp(),
    lastUpdated: timestamp()
  }

  const thoughtY = {
    id: hashThought('y'),
    value: 'y',
    rank: 0,
    contexts: [],
    created: timestamp(),
    lastUpdated: timestamp()
  }

  await firebase.updateThoughtIndex({
    [hashThought(thoughtX.value)]: thoughtX,
    [hashThought(thoughtY.value)]: thoughtY,
  })

  const dbThought1 = await firebase.getThought(thoughtX.value)
  expect(dbThought1).toEqual(thoughtX)

  const dbThought2 = await firebase.getThought(thoughtY.value)
  expect(dbThought2).toEqual(thoughtY)
})

test('updateContextIndex', async () => {

  const parentEntryX = {
    id: hashContext(['x']),
    children: [
      { value: 'a', rank: 0 },
      { value: 'b', rank: 1 },
      { value: 'c', rank: 2 },
    ],
    lastUpdated: timestamp()
  }

  const parentEntryY = {
    id: hashContext(['y']),
    children: [
      { value: 'd', rank: 0 },
      { value: 'e', rank: 1 },
      { value: 'f', rank: 2 },
    ],
    lastUpdated: timestamp()
  }

  await firebase.updateContextIndex({
    [hashContext(['x'])]: parentEntryX,
    [hashContext(['y'])]: parentEntryY,
  })

  const contextX = await firebase.getContext(['x'])
  expect(contextX).toEqual({
    ...parentEntryX,
    id: hashContext(['x']),
  })

  const contextY = await firebase.getContext(['y'])
  expect(contextY).toEqual({
    ...parentEntryY,
    id: hashContext(['y']),
  })
})

describe('getDescendantThoughts', () => {

  test('default', async () => {

    const thoughtX = {
      id: hashThought('x'),
      value: 'x',
      rank: 0,
      contexts: [],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const thoughtY = {
      id: hashThought('y'),
      value: 'y',
      rank: 0,
      contexts: [{
        context: ['a'],
        rank: 0,
        lastUpdated: timestamp(),
      }],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const thoughtA = {
      id: hashThought('a'),
      value: 'a',
      rank: 0,
      contexts: [{
        context: ['x'],
        rank: 0,
        lastUpdated: timestamp(),
      }],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const thoughtB = {
      id: hashThought('b'),
      value: 'b',
      rank: 0,
      contexts: [{
        context: ['x', 'a'],
        rank: 0,
        lastUpdated: timestamp(),
      }],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const thoughtZ = {
      id: hashThought('z'),
      value: 'z',
      rank: 0,
      contexts: [{
        context: ['x', 'y'],
        rank: 0,
        lastUpdated: timestamp(),
      }],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const parentEntryX = {
      id: hashContext(['x']),
      children: [
        { value: 'y', rank: 0 },
        { value: 'a', rank: 1 },
      ],
      lastUpdated: timestamp(),
    }

    const parentEntryY = {
      id: hashContext(['x', 'y']),
      children: [
        { value: 'z', rank: 0 },
      ],
      lastUpdated: timestamp(),
    }

    const parentEntryA = {
      id: hashContext(['x', 'a']),
      children: [
        { value: 'b', rank: 0 },
      ],
      lastUpdated: timestamp()
    }

    const parentEntryZ = {
      id: hashContext(['x', 'y', 'z']),
      children: [],
      lastUpdated: timestamp()
    }

    const parentEntryB = {
      id: hashContext(['x', 'a', 'b']),
      children: [],
      lastUpdated: timestamp()
    }

    await firebase.updateThoughtIndex({
      [hashThought('x')]: thoughtX,
      [hashThought('y')]: thoughtY,
      [hashThought('z')]: thoughtZ,
      [hashThought('a')]: thoughtA,
      [hashThought('b')]: thoughtB,
    })

    await firebase.updateContextIndex({
      [hashContext(['x'])]: parentEntryX,
      [hashContext(['x', 'y'])]: parentEntryY,
      [hashContext(['x', 'y', 'z'])]: parentEntryZ,
      [hashContext(['x', 'a'])]: parentEntryA,
      [hashContext(['x', 'a', 'b'])]: parentEntryB,
    })

    const thoughts = await firebase.getDescendantThoughts(['x'])

    expect(thoughts).toHaveProperty('contextIndex')

    expect(thoughts.contextIndex).toEqual({
      [hashContext(['x'])]: parentEntryX,
      [hashContext(['x', 'y'])]: {
        ...parentEntryY,
        id: hashContext(['x', 'y']),
      },
      [hashContext(['x', 'y', 'z'])]: {
        ...parentEntryZ,
        id: hashContext(['x', 'y', 'z']),
      },
      [hashContext(['x', 'a'])]: {
        ...parentEntryA,
        id: hashContext(['x', 'a']),
      },
      [hashContext(['x', 'a', 'b'])]: {
        ...parentEntryB,
        id: hashContext(['x', 'a', 'b']),
      },
    })

    expect(thoughts).toHaveProperty('thoughtIndex')

    expect(thoughts.thoughtIndex).toEqual({
      [hashThought('y')]: thoughtY,
      [hashThought('z')]: thoughtZ,
      [hashThought('a')]: thoughtA,
      [hashThought('b')]: thoughtB,
    })

  })

  test('unroot descendant contexts', async () => {

    const thoughtRoot = {
      id: hashThought(ROOT_TOKEN),
      value: ROOT_TOKEN,
      contexts: [],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const thoughtY = {
      id: hashThought('y'),
      value: 'y',
      contexts: [{
        context: [ROOT_TOKEN],
        rank: 0,
        lastUpdated: timestamp(),
      }],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const thoughtZ = {
      id: hashThought('z'),
      value: 'z',
      contexts: [{
        context: ['x', 'y'],
        rank: 0,
        lastUpdated: timestamp(),
      }],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const parentEntryX = {
      id: hashContext(['x']),
      children: [{ value: 'y', rank: 0 }],
      lastUpdated: timestamp(),
    }

    const parentEntryY = {
      id: hashContext(['x', 'y']),
      children: [{ value: 'z', rank: 0 }],
      lastUpdated: timestamp(),
    }

    const parentEntryZ = {
      id: hashContext(['x', 'y', 'z']),
      children: [],
      lastUpdated: timestamp(),
    }

    await firebase.updateThoughtIndex({
      [hashThought(ROOT_TOKEN)]: thoughtRoot,
      [hashThought('y')]: thoughtY,
      [hashThought('z')]: thoughtZ,
    })

    await firebase.updateContextIndex({
      [hashContext([ROOT_TOKEN])]: parentEntryX,
      [hashContext(['y'])]: parentEntryY,
      [hashContext(['y', 'z'])]: parentEntryZ,
    })

    const thoughts = await firebase.getDescendantThoughts([ROOT_TOKEN])

    expect(thoughts).toHaveProperty('contextIndex')

    expect(thoughts.contextIndex).toEqual({
      [hashContext([ROOT_TOKEN])]: parentEntryX,
      [hashContext(['y'])]: parentEntryY,
      [hashContext(['y', 'z'])]: parentEntryZ,
    })

    expect(thoughts).toHaveProperty('thoughtIndex')

    expect(thoughts.thoughtIndex).toEqual({
      [hashThought('y')]: thoughtY,
      [hashThought('z')]: thoughtZ,
    })

  })

  test.skip('maxDepth: 1', async () => {

    const thoughtX = {
      id: hashThought('x'),
      value: 'x',
      contexts: [[]],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const thoughtY = {
      id: hashThought('y'),
      value: 'y',
      contexts: [['x']],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const thoughtZ = {
      id: hashThought('z'),
      value: 'z',
      contexts: [['x', 'y']],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const parentEntryX = { children: [{ value: 'y', rank: 0 }] }
    const parentEntryY = { children: [{ value: 'z', rank: 0 }] }
    const parentEntryLeaf = { children: [] }

    await firebase.updateThoughtIndex({
      [hashThought('x')]: thoughtX,
      [hashThought('y')]: thoughtY,
      [hashThought('z')]: thoughtZ,
    })

    await firebase.updateContextIndex({
      [hashContext(['x'])]: parentEntryX,
      [hashContext(['x', 'y'])]: parentEntryY,
      [hashContext(['x', 'y', 'z'])]: parentEntryLeaf,
    })

    // only fetch 1 level of descendants
    const thoughts = await firebase.getDescendantThoughts(['x'], { maxDepth: 1 })

    expect(thoughts).toHaveProperty('contextIndex')

    expect(thoughts.contextIndex).toEqual({
      [hashContext(['x'])]: {
        ...parentEntryX,
        id: hashContext(['x']),
      },
      // children are pending
      [hashContext(['x', 'y'])]: {
        children: [],
        lastUpdated: never(),
        pending: true,
      },
    })

    expect(thoughts).toHaveProperty('thoughtIndex')

    expect(thoughts.thoughtIndex).toEqual({
      [hashThought('y')]: thoughtY,
    })

  })

  test.skip('maxDepth: 2', async () => {

    const thoughtX = {
      id: hashThought('x'),
      value: 'x',
      contexts: [[]],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const thoughtY = {
      id: hashThought('y'),
      value: 'y',
      contexts: [['x']],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const thoughtZ = {
      id: hashThought('z'),
      value: 'z',
      contexts: [['x', 'y']],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const thoughtM = {
      id: hashThought('m'),
      value: 'm',
      contexts: [['x', 'y', 'z']],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const parentEntryX = { children: [{ value: 'y', rank: 0 }] }
    const parentEntryY = { children: [{ value: 'z', rank: 0 }] }
    const parentEntryZ = { children: [{ value: 'm', rank: 0 }] }
    const parentEntryLeaf = { children: [] }

    await firebase.updateThoughtIndex({
      [hashThought('x')]: thoughtX,
      [hashThought('y')]: thoughtY,
      [hashThought('z')]: thoughtZ,
      [hashThought('m')]: thoughtM,
    })

    await firebase.updateContextIndex({
      [hashContext(['x'])]: parentEntryX,
      [hashContext(['x', 'y'])]: parentEntryY,
      [hashContext(['x', 'y', 'z'])]: parentEntryZ,
      [hashContext(['x', 'y', 'z', 'm'])]: parentEntryLeaf,
    })

    // only fetch 2 levels of descendants
    const thoughts = await firebase.getDescendantThoughts(['x'], { maxDepth: 2 })

    expect(thoughts).toHaveProperty('contextIndex')

    expect(thoughts.contextIndex).toEqual({
      [hashContext(['x'])]: {
        ...parentEntryX,
        id: hashContext(['x']),
      },
      [hashContext(['x', 'y'])]: {
        ...parentEntryY,
        id: hashContext(['x', 'y']),
      },
      // grandchildren are pending
      [hashContext(['x', 'y', 'z'])]: {
        children: [],
        lastUpdated: '',
        pending: true,
      },
    })

    expect(thoughts).toHaveProperty('thoughtIndex')

    expect(thoughts.thoughtIndex).toEqual({
      [hashThought('y')]: thoughtY,
      [hashThought('z')]: thoughtZ,
    })

  })
})

describe('getManyDescendants', () => {

  test.skip('default', async () => {

    const thoughtX = {
      id: hashThought('x'),
      value: 'x',
      contexts: [[]],
    }

    const thoughtY = {
      id: hashThought('y'),
      value: 'y',
      contexts: [['x']],
    }

    const thoughtZ = {
      id: hashThought('z'),
      value: 'z',
      contexts: [['x', 'y']],
    }

    const thoughtM = {
      id: hashThought('m'),
      value: 'm',
      contexts: [['t', 'u', 'v']],
    }

    const thoughtN = {
      id: hashThought('n'),
      value: 'n',
      contexts: [['t', 'u', 'v', 'm']],
    }

    const parentEntryX = { children: [{ value: 'y', rank: 0 }] }
    const parentEntryY = { children: [{ value: 'z', rank: 0 }] }
    const parentEntryM = { children: [{ value: 'n', rank: 0 }] }
    const parentEntryLeaf = { children: [] }

    await firebase.updateThoughtIndex({
      [hashThought('x')]: thoughtX,
      [hashThought('y')]: thoughtY,
      [hashThought('z')]: thoughtZ,
      [hashThought('m')]: thoughtM,
      [hashThought('n')]: thoughtN,
    })

    await firebase.updateContextIndex({
      [hashContext(['x'])]: parentEntryX,
      [hashContext(['x', 'y'])]: parentEntryY,
      [hashContext(['x', 'y', 'z'])]: parentEntryLeaf,
      [hashContext(['t', 'u', 'v', 'm'])]: parentEntryM,
      [hashContext(['t', 'u', 'v', 'm', 'n'])]: parentEntryLeaf,
    })

    const thoughts = await firebase.getManyDescendants({
      [hashContext(['x'])]: ['x'],
      [hashContext(['t', 'u', 'v', 'm'])]: ['t', 'u', 'v', 'm'],
    })

    expect(thoughts).toHaveProperty('contextIndex')

    expect(thoughts.contextIndex).toEqual({
      [hashContext(['x'])]: {
        ...parentEntryX,
        id: hashContext(['x']),
      },
      [hashContext(['x', 'y'])]: {
        ...parentEntryY,
        id: hashContext(['x', 'y']),
      },
      [hashContext(['x', 'y', 'z'])]: {
        ...parentEntryLeaf,
        id: hashContext(['x', 'y', 'z']),
      },
      [hashContext(['t', 'u', 'v', 'm'])]: {
        ...parentEntryM,
        id: hashContext(['t', 'u', 'v', 'm']),
      },
      [hashContext(['t', 'u', 'v', 'm', 'n'])]: {
        ...parentEntryLeaf,
        id: hashContext(['t', 'u', 'v', 'm', 'n']),
      },
    })

    expect(thoughts).toHaveProperty('thoughtIndex')

    expect(thoughts.thoughtIndex).toEqual({
      [hashThought('y')]: thoughtY,
      [hashThought('z')]: thoughtZ,
      [hashThought('n')]: thoughtN,
    })

  })

  test.skip('maxDepth', async () => {

    const thoughtX = {
      id: hashThought('x'),
      value: 'x',
      contexts: [[]],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const thoughtY = {
      id: hashThought('y'),
      value: 'y',
      contexts: [['x']],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const thoughtZ = {
      id: hashThought('z'),
      value: 'z',
      contexts: [['x', 'y']],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const thoughtM = {
      id: hashThought('m'),
      value: 'm',
      contexts: [['t', 'u', 'v']],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const thoughtN = {
      id: hashThought('n'),
      value: 'n',
      contexts: [['t', 'u', 'v', 'm']],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const parentEntryX = { children: [{ value: 'y', rank: 0 }] }
    const parentEntryY = { children: [{ value: 'z', rank: 0 }] }
    const parentEntryM = { children: [{ value: 'n', rank: 0 }] }
    const parentEntryLeaf = { children: [] }

    await firebase.updateThoughtIndex({
      [hashThought('x')]: thoughtX,
      [hashThought('y')]: thoughtY,
      [hashThought('z')]: thoughtZ,
      [hashThought('m')]: thoughtM,
      [hashThought('n')]: thoughtN,
    })

    await firebase.updateContextIndex({
      [hashContext(['x'])]: parentEntryX,
      [hashContext(['x', 'y'])]: parentEntryY,
      [hashContext(['x', 'y', 'z'])]: parentEntryLeaf,
      [hashContext(['t', 'u', 'v', 'm'])]: parentEntryM,
      [hashContext(['t', 'u', 'v', 'm', 'n'])]: parentEntryLeaf,
    })

    const thoughts = await firebase.getManyDescendants({
      [hashContext(['x'])]: ['x'],
      [hashContext(['t', 'u', 'v', 'm'])]: ['t', 'u', 'v', 'm'],
    }, { maxDepth: 2 })

    expect(thoughts).toHaveProperty('contextIndex')

    expect(thoughts.contextIndex).toEqual({
      [hashContext(['x'])]: {
        ...parentEntryX,
        id: hashContext(['x']),
      },
      [hashContext(['x', 'y'])]: {
        ...parentEntryY,
        id: hashContext(['x', 'y']),
      },
      [hashContext(['x', 'y', 'z'])]: {
        children: [],
        lastUpdated: never(),
        pending: true,
      },
      [hashContext(['t', 'u', 'v', 'm'])]: {
        ...parentEntryM,
        id: hashContext(['t', 'u', 'v', 'm']),
      },
      [hashContext(['t', 'u', 'v', 'm', 'n'])]: {
        ...parentEntryLeaf,
        id: hashContext(['t', 'u', 'v', 'm', 'n']),
      },
    })

    expect(thoughts).toHaveProperty('thoughtIndex')

    expect(thoughts.thoughtIndex).toEqual({
      [hashThought('y')]: thoughtY,
      [hashThought('z')]: thoughtZ,
      [hashThought('n')]: thoughtN,
    })

  })

  test.skip('ignore maxDepth on EM context', async () => {

    const thought1 = {
      id: hashThought(EM_TOKEN),
      value: EM_TOKEN,
      contexts: [[]],
    }

    const thoughtY = {
      id: hashThought('y'),
      value: 'y',
      contexts: [[EM_TOKEN]],
    }

    const thoughtZ = {
      id: hashThought('z'),
      value: 'z',
      contexts: [[EM_TOKEN, 'y']],
    }

    const thoughtM = {
      id: hashThought('m'),
      value: 'm',
      contexts: [['t', 'u', 'v']],
    }

    const thoughtN = {
      id: hashThought('n'),
      value: 'n',
      contexts: [['t', 'u', 'v', 'm']],
    }

    const parentEntryEM = { children: [{ value: 'y', rank: 0 }] }
    const parentEntryY = { children: [{ value: 'z', rank: 0 }] }
    const parentEntryM = { children: [{ value: 'n', rank: 0 }] }
    const parentEntryLeaf = { children: [] }

    await firebase.updateThoughtIndex({
      [hashThought(EM_TOKEN)]: thought1,
      [hashThought('y')]: thoughtY,
      [hashThought('z')]: thoughtZ,
      [hashThought('m')]: thoughtM,
      [hashThought('n')]: thoughtN,
    })

    await firebase.updateContextIndex({
      [hashContext([EM_TOKEN])]: parentEntryEM,
      [hashContext([EM_TOKEN, 'y'])]: parentEntryY,
      [hashContext([EM_TOKEN, 'y', 'z'])]: parentEntryLeaf,
      [hashContext(['t', 'u', 'v', 'm'])]: parentEntryM,
      [hashContext(['t', 'u', 'v', 'm', 'n'])]: parentEntryLeaf,
    })

    const thoughts = await firebase.getManyDescendants({
      [hashContext([EM_TOKEN])]: [EM_TOKEN],
      [hashContext(['t', 'u', 'v', 'm'])]: ['t', 'u', 'v', 'm'],
    }, { maxDepth: 1 })

    expect(thoughts).toHaveProperty('contextIndex')

    expect(thoughts.contextIndex).toEqual({
      [hashContext([EM_TOKEN])]: {
        ...parentEntryEM,
        id: hashContext([EM_TOKEN]),
      },
      [hashContext([EM_TOKEN, 'y'])]: {
        ...parentEntryY,
        id: hashContext([EM_TOKEN, 'y']),
      },
      [hashContext([EM_TOKEN, 'y', 'z'])]: {
        ...parentEntryLeaf,
        id: hashContext([EM_TOKEN, 'y', 'z']),
      },
      [hashContext(['t', 'u', 'v', 'm'])]: {
        ...parentEntryM,
        id: hashContext(['t', 'u', 'v', 'm']),
      },
      // still uses maxDepth on non-EM contexts
      [hashContext(['t', 'u', 'v', 'm', 'n'])]: {
        children: [],
        lastUpdated: never(),
        pending: true,
      },
    })

    expect(thoughts).toHaveProperty('thoughtIndex')

    expect(thoughts.thoughtIndex).toEqual({
      [hashThought('y')]: thoughtY,
      [hashThought('z')]: thoughtZ,
      [hashThought('n')]: thoughtN,
    })

  })

})
