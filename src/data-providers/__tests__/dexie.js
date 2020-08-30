import { store } from '../../store'
import { EM_TOKEN, ROOT_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import { getChildren, getThought } from '../../selectors'
import initDB, * as db from '../dexie'
import { hashContext, hashThought, never, timestamp } from '../../util'

jest.useFakeTimers()

// mock debounce to use 0 delay
jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),

  // jest.mock must be inline
  // possible workarounds:
  // - use global
  // - https://stackoverflow.com/questions/40465047/how-can-i-mock-an-es6-module-import-using-jest
  debounce: jest.fn().mockImplementation((fn, delay) => {
    let timer = null // eslint-disable-line fp/no-let
    let pendingArgs = null // eslint-disable-line fp/no-let

    const cancel = jest.fn(() => {
      if (timer) {
        clearTimeout(timer)
      }
      timer = null
      pendingArgs = null
    })

    const flush = jest.fn(() => {
      if (timer) {
        fn(...pendingArgs)
        cancel()
      }
    })

    // eslint-disable-next-line jsdoc/require-jsdoc
    const wrapped = (...args) => {
      cancel()

      pendingArgs = args

      // TODO: why doesn't jest.runOnlyPendingTimers work here?
      // use 0 instead of given delay as a workaround
      timer = setTimeout(flush, 0)
    }

    wrapped.cancel = cancel
    wrapped.flush = flush
    wrapped.delay = delay

    return wrapped
  }),
}))

describe('dexie', () => {

  beforeEach(async () => {
    await initDB()
  })

  afterEach(async () => {
    await db.clearAll()
  })

  test('getThoughtById', async () => {

    const nothought = await db.getThoughtById(12345)
    expect(nothought).toBeUndefined()

    const thought = {
      id: 12345,
      value: 'x',
      contexts: [['a', 'b', 'c']],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    await db.updateThought(12345, thought)

    const dbThought = await db.getThoughtById(12345)
    expect(dbThought).toEqual(thought)

  })

  test('getThought', async () => {

    const nothought = await db.getThought('x')
    expect(nothought).toBeUndefined()

    const thought = {
      id: hashThought('x'),
      value: 'x',
      contexts: [['a', 'b', 'c']],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    await db.updateThought(12345, thought)

    const dbThought = await db.getThought('x')
    expect(dbThought).toEqual(thought)
  })

  test('getContext', async () => {

    const nocontext = await db.getContext(['x'])
    expect(nocontext).toBeUndefined()

    const parentEntry = {
      children: [
        { value: 'a', rank: 0 },
        { value: 'b', rank: 1 },
        { value: 'c', rank: 2 },
      ],
      lastUpdated: timestamp()
    }

    await db.updateContext(hashContext(['x']), parentEntry)

    const dbContext = await db.getContext(['x'])
    expect(dbContext).toEqual({
      ...parentEntry,
      id: hashContext(['x']),
    })
  })

  test('updateThoughtIndex', async () => {

    const thoughtX = {
      id: hashThought('x'),
      value: 'x',
      contexts: [['a', 'b', 'c']],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    const thoughtY = {
      id: hashThought('y'),
      value: 'y',
      contexts: [['d', 'e', 'f']],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    await db.updateThoughtIndex({
      [hashThought(thoughtX.value)]: thoughtX,
      [hashThought(thoughtY.value)]: thoughtY,
    })

    const dbThought1 = await db.getThought(thoughtX.value)
    expect(dbThought1).toEqual(thoughtX)

    const dbThought2 = await db.getThought(thoughtY.value)
    expect(dbThought2).toEqual(thoughtY)
  })

  test('updateContextIndex', async () => {

    const parentEntryX = {
      children: [
        { value: 'a', rank: 0 },
        { value: 'b', rank: 1 },
        { value: 'c', rank: 2 },
      ],
      lastUpdated: timestamp()
    }

    const parentEntryY = {
      children: [
        { value: 'd', rank: 0 },
        { value: 'e', rank: 1 },
        { value: 'f', rank: 2 },
      ],
      lastUpdated: timestamp()
    }

    await db.updateContextIndex({
      [hashContext(['x'])]: parentEntryX,
      [hashContext(['y'])]: parentEntryY,
    })

    const contextX = await db.getContext(['x'])
    expect(contextX).toEqual({
      ...parentEntryX,
      id: hashContext(['x']),
    })

    const contextY = await db.getContext(['y'])
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

      const thoughtA = {
        id: hashThought('a'),
        value: 'a',
        contexts: [['x']],
        created: timestamp(),
        lastUpdated: timestamp()
      }

      const thoughtB = {
        id: hashThought('b'),
        value: 'b',
        contexts: [['x', 'a']],
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

      const parentEntryX = {
        children: [
          { value: 'y', rank: 0 },
          { value: 'a', rank: 1 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryY = {
        children: [
          { value: 'z', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryA = {
        children: [
          { value: 'b', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryLeaf = {
        children: [],
        lastUpdated: timestamp()
      }

      await db.updateThoughtIndex({
        [hashThought('x')]: thoughtX,
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
        [hashThought('a')]: thoughtA,
        [hashThought('b')]: thoughtB,
      })

      await db.updateContextIndex({
        [hashContext(['x'])]: parentEntryX,
        [hashContext(['x', 'y'])]: parentEntryY,
        [hashContext(['x', 'y', 'z'])]: parentEntryLeaf,
        [hashContext(['x', 'a'])]: parentEntryA,
        [hashContext(['x', 'a', 'b'])]: parentEntryLeaf,
      })

      const thoughts = await db.getDescendantThoughts(['x'])

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
        [hashContext(['x', 'a'])]: {
          ...parentEntryA,
          id: hashContext(['x', 'a']),
        },
        [hashContext(['x', 'a', 'b'])]: {
          ...parentEntryLeaf,
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

      const thought1 = {
        id: hashThought(ROOT_TOKEN),
        value: ROOT_TOKEN,
        contexts: [[]],
        created: timestamp(),
        lastUpdated: timestamp()
      }

      const thoughtY = {
        id: hashThought('y'),
        value: 'y',
        contexts: [[ROOT_TOKEN]],
        created: timestamp(),
        lastUpdated: timestamp()
      }

      const thoughtZ = {
        id: hashThought('z'),
        value: 'z',
        contexts: [['y']],
        created: timestamp(),
        lastUpdated: timestamp()
      }

      const parentEntryX = {
        children: [
          { value: 'y', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryY = {
        children: [
          { value: 'z', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryLeaf = {
        children: [],
        lastUpdated: timestamp()
      }

      await db.updateThoughtIndex({
        [hashThought(ROOT_TOKEN)]: thought1,
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
      })

      await db.updateContextIndex({
        [hashContext([ROOT_TOKEN])]: parentEntryX,
        [hashContext(['y'])]: parentEntryY,
        [hashContext(['y', 'z'])]: parentEntryLeaf,
      })

      const thoughts = await db.getDescendantThoughts([ROOT_TOKEN])

      expect(thoughts).toHaveProperty('contextIndex')

      expect(thoughts.contextIndex).toEqual({
        [hashContext([ROOT_TOKEN])]: {
          ...parentEntryX,
          id: hashContext([ROOT_TOKEN]),
        },
        [hashContext(['y'])]: {
          ...parentEntryY,
          id: hashContext(['y']),
        },
        [hashContext(['y', 'z'])]: {
          ...parentEntryLeaf,
          id: hashContext(['y', 'z']),
        },
      })

      expect(thoughts).toHaveProperty('thoughtIndex')

      expect(thoughts.thoughtIndex).toEqual({
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
      })

    })

    test('maxDepth: 1', async () => {

      const thought1 = {
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

      const parentEntryX = {
        children: [
          { value: 'y', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryY = {
        children: [
          { value: 'z', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryLeaf = {
        children: [],
        lastUpdated: timestamp()
      }

      await db.updateThoughtIndex({
        [hashThought('x')]: thought1,
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
      })

      await db.updateContextIndex({
        [hashContext(['x'])]: parentEntryX,
        [hashContext(['x', 'y'])]: parentEntryY,
        [hashContext(['x', 'y', 'z'])]: parentEntryLeaf,
      })

      // only fetch 1 level of descendants
      const thoughts = await db.getDescendantThoughts(['x'], { maxDepth: 1 })

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

    test('maxDepth: 2', async () => {

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

      const parentEntryX = {
        children: [
          { value: 'y', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryY = {
        children: [
          { value: 'z', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryZ = {
        children: [
          { value: 'm', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryLeaf = {
        children: [],
        lastUpdated: timestamp()
      }

      await db.updateThoughtIndex({
        [hashThought('x')]: thoughtX,
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
        [hashThought('m')]: thoughtM,
      })

      await db.updateContextIndex({
        [hashContext(['x'])]: parentEntryX,
        [hashContext(['x', 'y'])]: parentEntryY,
        [hashContext(['x', 'y', 'z'])]: parentEntryZ,
        [hashContext(['x', 'y', 'z', 'm'])]: parentEntryLeaf,
      })

      // only fetch 2 levels of descendants
      const thoughts = await db.getDescendantThoughts(['x'], { maxDepth: 2 })

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

    test('default', async () => {

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

      const parentEntryX = {
        children:[
          { value: 'y', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryY = {
        children: [
          { value: 'z', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryZ = {
        children: [],
        lastUpdated: timestamp()
      }

      const parentEntryM = {
        children: [
          { value: 'n', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryLeaf = {
        children: [],
        lastUpdated: timestamp()
      }

      await db.updateThoughtIndex({
        [hashThought('x')]: thoughtX,
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
        [hashThought('m')]: thoughtM,
        [hashThought('n')]: thoughtN,
      })

      await db.updateContextIndex({
        [hashContext(['x'])]: parentEntryX,
        [hashContext(['x', 'y'])]: parentEntryY,
        [hashContext(['x', 'y', 'z'])]: parentEntryZ,
        [hashContext(['t', 'u', 'v', 'm'])]: parentEntryM,
        [hashContext(['t', 'u', 'v', 'm', 'n'])]: parentEntryLeaf,
      })

      const thoughts = await db.getManyDescendants({
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
          ...parentEntryZ,
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

    test('maxDepth', async () => {

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

      const parentEntryX = {
        children:[
          { value: 'y', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryY = {
        children: [
          { value: 'z', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryM = {
        children: [
          { value: 'n', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryLeaf = {
        children: [],
        lastUpdated: timestamp()
      }

      await db.updateThoughtIndex({
        [hashThought('x')]: thoughtX,
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
        [hashThought('m')]: thoughtM,
        [hashThought('n')]: thoughtN,
      })

      await db.updateContextIndex({
        [hashContext(['x'])]: parentEntryX,
        [hashContext(['x', 'y'])]: parentEntryY,
        [hashContext(['x', 'y', 'z'])]: parentEntryLeaf,
        [hashContext(['t', 'u', 'v', 'm'])]: parentEntryM,
        [hashContext(['t', 'u', 'v', 'm', 'n'])]: parentEntryLeaf,
      })

      const thoughts = await db.getManyDescendants({
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

    test('Ignore maxDepth on EM context', async () => {

      const thought1 = {
        id: hashThought(EM_TOKEN),
        value: EM_TOKEN,
        contexts: [[]],
        created: timestamp(),
        lastUpdated: timestamp()
      }

      const thoughtY = {
        id: hashThought('y'),
        value: 'y',
        contexts: [[EM_TOKEN]],
        created: timestamp(),
        lastUpdated: timestamp()
      }

      const thoughtZ = {
        id: hashThought('z'),
        value: 'z',
        contexts: [[EM_TOKEN, 'y']],
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

      const parentEntryEM = {
        children:[
          { value: 'y', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryY = {
        children: [
          { value: 'z', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryM = {
        children: [
          { value: 'n', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryLeaf = {
        children: [],
        lastUpdated: timestamp()
      }

      await db.updateThoughtIndex({
        [hashThought(EM_TOKEN)]: thought1,
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
        [hashThought('m')]: thoughtM,
        [hashThought('n')]: thoughtN,
      })

      await db.updateContextIndex({
        [hashContext([EM_TOKEN])]: parentEntryEM,
        [hashContext([EM_TOKEN, 'y'])]: parentEntryY,
        [hashContext([EM_TOKEN, 'y', 'z'])]: parentEntryLeaf,
        [hashContext(['t', 'u', 'v', 'm'])]: parentEntryM,
        [hashContext(['t', 'u', 'v', 'm', 'n'])]: parentEntryLeaf,
      })

      const thoughts = await db.getManyDescendants({
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

})

describe('integration', () => {

  beforeEach(async () => {
    await initialize()

    // fake timers cause an infinite loop on _.debounce
    // Jest v26 contains a 'modern' option for useFakeTimers (https://github.com/facebook/jest/pull/7776), but I am getting a "TypeError: Cannot read property 'useFakeTimers' of undefined" error when I call jest.useFakeTimers('modern'). The same error does not uccor when I use 'legacy' or omit the argument (react-scripts v4.0.0-next.64).
    // https://github.com/facebook/jest/issues/3465#issuecomment-504908570
    jest.runOnlyPendingTimers()
  })

  afterEach(async () => {
    store.dispatch({ type: 'clear' })
    await db.clearAll()
    jest.runOnlyPendingTimers()
  })

  it('load settings into indexedDB on initialization', async () => {
    const thoughtState = getThought(store.getState(), 'Settings')

    expect(thoughtState).not.toBeUndefined()
    expect(thoughtState.contexts).toHaveLength(1)

    // TODO: Tests fail without a dummy call to the database. Why?
    await db.getHelpers()

    const thoughtDB = await db.getThought('Settings')

    expect(thoughtDB).not.toBeUndefined()
    expect(thoughtDB.contexts).toHaveLength(1)

    expect(thoughtState.contexts[0].id).toEqual(thoughtDB.contexts[0].id)
  })

  it('persist newThought', async () => {

    store.dispatch({ type: 'newThought', value: 'a' })

    jest.runOnlyPendingTimers()

    const parentEntryRoot = await db.getContext([ROOT_TOKEN])

    expect(parentEntryRoot).toMatchObject({
      children: [{ value: 'a', rank: 0 }]
    })
  })

  it('persist existingThoughtChange', async () => {

    store.dispatch([
      { type: 'newThought', value: '' },
      {
        type: 'existingThoughtChange',
        context: [ROOT_TOKEN],
        oldValue: '',
        newValue: 'a',
        thoughtsRanked: [{ value: '', rank: 0 }]
      }
    ])

    jest.runOnlyPendingTimers()

    const parentEntryRoot = await db.getContext([ROOT_TOKEN])

    expect(parentEntryRoot).toMatchObject({
      children: [{ value: 'a', rank: 0 }]
    })

    await initialize()
    jest.runOnlyPendingTimers()
  })

  it('load thought', async () => {

    const parentEntryRoot1 = await db.getContext([ROOT_TOKEN])
    jest.runOnlyPendingTimers()
    expect(parentEntryRoot1).toBeUndefined()

    // create a thought, which will get persisted to local db
    store.dispatch({ type: 'newThought', value: 'a' })
    jest.runOnlyPendingTimers()

    const parentEntryRoot = await db.getContext([ROOT_TOKEN])
    jest.runOnlyPendingTimers()
    expect(parentEntryRoot).toMatchObject({
      children: [{ value: 'a', rank: 0 }]
    })

    // clear state
    store.dispatch({ type: 'clear' })
    jest.runOnlyPendingTimers()

    const children = getChildren(store.getState(), [ROOT_TOKEN])
    expect(children).toHaveLength(0)

    // confirm thought is still in local db after state has been cleared
    const parentEntryRootAfterReload = await db.getContext([ROOT_TOKEN])
    jest.runOnlyPendingTimers()
    expect(parentEntryRootAfterReload).toMatchObject({
      children: [{ value: 'a', rank: 0 }]
    })

    // call initialize again to reload from db (simulating page refresh)
    await initialize()
    jest.runOnlyPendingTimers()

    const childrenAfterInitialize = getChildren(store.getState(), [ROOT_TOKEN])
    expect(childrenAfterInitialize).toMatchObject([
      { value: 'a', rank: 0 }
    ])
  })

  // TODO: Not passing as expected. Unknown timing issues.
  it.skip('load buffered thoughts', async () => {

    // a, b, c, d, e, ...
    // create a number of descendants equal to double the buffer depth to test loading multiple levels
    // const values = new Array(THOUGHT_BUFFER_DEPTH * 2 + 1).fill(null).map((_, i) => String.fromCharCode(i + 97))
    const values = 'abcde'.split('')
    store.dispatch(values.map(value => ({ type: 'newSubthought', value })))
    jest.runOnlyPendingTimers()

    expect(await db.getContext([ROOT_TOKEN])).toMatchObject({ children: [{ value: 'a', rank: 0 }] })
    expect(await db.getContext(['a'])).toMatchObject({ children: [{ value: 'b', rank: 0 }] })
    expect(await db.getContext(['a', 'b'])).toMatchObject({ children: [{ value: 'c', rank: 0 }] })
    expect(await db.getContext(['a', 'b', 'c'])).toMatchObject({ children: [{ value: 'd', rank: 0 }] })
    expect(await db.getContext(['a', 'b', 'c', 'd'])).toMatchObject({ children: [{ value: 'e', rank: 0 }] })

    // clear state
    store.dispatch({ type: 'clear' })
    jest.runOnlyPendingTimers()

    // call initialize again to reload from db (simulating page refresh)
    await initialize()
    jest.runOnlyPendingTimers()

    const state = store.getState()
    expect(getChildren(state, [ROOT_TOKEN])).toMatchObject([{ value: 'a', rank: 0 }])
    expect(getChildren(state, ['a'])).toMatchObject([{ value: 'b', rank: 0 }])
    expect(getChildren(state, ['a', 'b'])).toMatchObject([{ value: 'c', rank: 0 }])
    expect(getChildren(state, ['a', 'b', 'c'])).toMatchObject([{ value: 'd', rank: 0 }])
    expect(getChildren(state, ['a', 'b', 'c', 'd'])).toMatchObject([{ value: 'e', rank: 0 }])
  })

})
