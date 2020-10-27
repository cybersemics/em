import _ from 'lodash'
import all from 'it-all'
import { EM_TOKEN, NOOP, RANKED_ROOT, ROOT_TOKEN } from '../constants'
import getDescendantThoughts from '../data-providers/data-helpers/getDescendantThoughts'
import getManyDescendants from '../data-providers/data-helpers/getManyDescendants'
import getContext from '../data-providers/data-helpers/getContext'
import getThought from '../data-providers/data-helpers/getThought'
import { hashContext, hashThought, initialState, mergeThoughts, never, timestamp } from '../util'
import { DataProvider } from '../data-providers/DataProvider'
import { importText } from '../action-creators'

/** Runs tests for a module that conforms to the data-provider API. */
const dataProviderTest = (provider: DataProvider) => {

  test('getThoughtById', async () => {

    const nothought = await provider.getThoughtById('12345')
    expect(nothought).toBeUndefined()

    const thought = {
      id: '12345',
      value: 'x',
      rank: 0,
      contexts: [],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    await provider.updateThought('12345', thought)

    const dbThought = await provider.getThoughtById('12345')
    expect(dbThought).toEqual(thought)

  })

  test('getThoughtsByIds', async () => {

    const text = `
      - x
        - y
    `

    const {
      contextIndexUpdates: contextIndex,
      thoughtIndexUpdates: thoughtIndex,
    } = importText(RANKED_ROOT, text)(NOOP, initialState)

    const thoughtX = thoughtIndex[hashThought('x')]
    const thoughtY = thoughtIndex[hashThought('y')]
    await provider.updateThought(hashThought('x'), thoughtX)
    await provider.updateThought(hashThought('y'), thoughtY)

    const dbThoughts = await provider.getThoughtsByIds([hashThought('x'), hashThought('y')])

    expect(dbThoughts).toMatchObject([thoughtX, thoughtY])
  })

  test('updateThought', async () => {

    const nothought = await getThought(provider, 'x')
    expect(nothought).toBeUndefined()

    const thought = {
      id: hashThought('x'),
      value: 'x',
      rank: 0,
      contexts: [],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    await provider.updateThought(thought.id, thought)

    const remoteThought = await getThought(provider, 'x')
    expect(remoteThought).toEqual(thought)
  })

  test('getContext', async () => {

    const nocontext = await getContext(provider, ['x'])
    expect(nocontext).toBeUndefined()

    const parentEntry = {
      id: hashContext(['x']),
      context: ['x'],
      children: [
        { value: 'a', rank: 0 },
        { value: 'b', rank: 1 },
        { value: 'c', rank: 2 },
      ],
      lastUpdated: timestamp()
    }

    await provider.updateContext(hashContext(['x']), parentEntry)

    const dbContext = await getContext(provider, ['x'])
    expect(dbContext).toEqual({
      ...parentEntry,
      id: hashContext(['x']),
    })
  })

  test('getContextsByIds', async () => {

    const parentEntryX = {
      id: hashContext(['x']),
      context: ['x'],
      children: [
        { value: 'a', rank: 0 },
        { value: 'b', rank: 1 },
        { value: 'c', rank: 2 },
      ],
      lastUpdated: timestamp()
    }

    const parentEntryA = {
      id: hashContext(['x', 'a']),
      context: ['x', 'a'],
      children: [],
      lastUpdated: timestamp()
    }

    await provider.updateContext(hashContext(['x']), parentEntryX)
    await provider.updateContext(hashContext(['x', 'a']), parentEntryA)

    const dbContexts = await provider.getContextsByIds([parentEntryX.id, parentEntryA.id])
    expect(dbContexts).toEqual([parentEntryX, parentEntryA])
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

    await provider.updateThoughtIndex({
      [hashThought(thoughtX.value)]: thoughtX,
      [hashThought(thoughtY.value)]: thoughtY,
    })

    const dbThought1 = await getThought(provider, thoughtX.value)
    expect(dbThought1).toEqual(thoughtX)

    const dbThought2 = await getThought(provider, thoughtY.value)
    expect(dbThought2).toEqual(thoughtY)
  })

  test('updateContextIndex', async () => {

    const parentEntryX = {
      id: hashContext(['x']),
      context: ['x'],
      children: [
        { value: 'a', rank: 0 },
        { value: 'b', rank: 1 },
        { value: 'c', rank: 2 },
      ],
      lastUpdated: timestamp()
    }

    const parentEntryY = {
      id: hashContext(['y']),
      context: ['y'],
      children: [
        { value: 'd', rank: 0 },
        { value: 'e', rank: 1 },
        { value: 'f', rank: 2 },
      ],
      lastUpdated: timestamp()
    }

    await provider.updateContextIndex({
      [hashContext(['x'])]: parentEntryX,
      [hashContext(['y'])]: parentEntryY,
    })

    const contextX = await getContext(provider, ['x'])
    expect(contextX).toEqual({
      ...parentEntryX,
      id: hashContext(['x']),
    })

    const contextY = await getContext(provider, ['y'])
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
        context: ['x'],
        children: [
          { value: 'y', rank: 0 },
          { value: 'a', rank: 1 },
        ],
        lastUpdated: timestamp(),
      }

      const parentEntryY = {
        id: hashContext(['x', 'y']),
        context: ['x', 'y'],
        children: [
          { value: 'z', rank: 0 },
        ],
        lastUpdated: timestamp(),
      }

      const parentEntryA = {
        id: hashContext(['x', 'a']),
        context: ['x', 'a'],
        children: [
          { value: 'b', rank: 0 },
        ],
        lastUpdated: timestamp()
      }

      const parentEntryZ = {
        id: hashContext(['x', 'y', 'z']),
        context: ['x', 'y', 'z'],
        children: [],
        lastUpdated: timestamp()
      }

      const parentEntryB = {
        id: hashContext(['x', 'a', 'b']),
        context: ['x', 'a', 'b'],
        children: [],
        lastUpdated: timestamp()
      }

      await provider.updateThoughtIndex({
        [hashThought('x')]: thoughtX,
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
        [hashThought('a')]: thoughtA,
        [hashThought('b')]: thoughtB,
      })

      await provider.updateContextIndex({
        [hashContext(['x'])]: parentEntryX,
        [hashContext(['x', 'y'])]: parentEntryY,
        [hashContext(['x', 'y', 'z'])]: parentEntryZ,
        [hashContext(['x', 'a'])]: parentEntryA,
        [hashContext(['x', 'a', 'b'])]: parentEntryB,
      })

      const thoughtChunks = await all(getDescendantThoughts(provider, ['x']))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

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
        [hashThought('x')]: thoughtX,
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
        rank: 0,
        contexts: [],
        created: timestamp(),
        lastUpdated: timestamp()
      }

      const thoughtX = {
        id: hashThought('x'),
        value: 'x',
        rank: 0,
        contexts: [{
          context: [ROOT_TOKEN],
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
          context: ['x'],
          rank: 0,
          lastUpdated: timestamp(),
        }],
        created: timestamp(),
        lastUpdated: timestamp()
      }

      const parentEntryRoot = {
        id: hashContext([ROOT_TOKEN]),
        context: [ROOT_TOKEN],
        children: [{ value: 'x', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryX = {
        id: hashContext(['x']),
        context: ['x'],
        children: [{ value: 'y', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryY = {
        id: hashContext(['x', 'y']),
        context: ['x', 'y'],
        children: [],
        lastUpdated: timestamp(),
      }

      await provider.updateThoughtIndex({
        [hashThought(ROOT_TOKEN)]: thoughtRoot,
        [hashThought('x')]: thoughtX,
        [hashThought('y')]: thoughtY,
      })

      await provider.updateContextIndex({
        [hashContext([ROOT_TOKEN])]: parentEntryRoot,
        [hashContext(['x'])]: parentEntryX,
        [hashContext(['x', 'y'])]: parentEntryY,
      })

      const thoughtChunks = await all(getDescendantThoughts(provider, [ROOT_TOKEN]))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts).toHaveProperty('contextIndex')

      expect(thoughts.contextIndex).toEqual({
        [hashContext([ROOT_TOKEN])]: parentEntryRoot,
        [hashContext(['x'])]: parentEntryX,
        [hashContext(['x', 'y'])]: parentEntryY,
      })

      expect(thoughts).toHaveProperty('thoughtIndex')

      expect(thoughts.thoughtIndex).toEqual({
        [hashThought(ROOT_TOKEN)]: thoughtRoot,
        [hashThought('x')]: thoughtX,
        [hashThought('y')]: thoughtY,
      })

    })

    test('maxDepth: 1', async () => {

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
          context: ['x'],
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

      const thoughtM = {
        id: hashThought('m'),
        value: 'm',
        rank: 0,
        contexts: [{
          context: ['x', 'y', 'z'],
          rank: 0,
          lastUpdated: timestamp(),
        }],
        created: timestamp(),
        lastUpdated: timestamp()
      }

      const parentEntryX = {
        id: hashContext(['x']),
        context: ['x'],
        children: [{ value: 'y', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryY = {
        id: hashContext(['x', 'y']),
        context: ['x', 'y'],
        children: [{ value: 'z', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryZ = {
        id: hashContext(['x', 'y', 'z']),
        context: ['x', 'y', 'z'],
        children: [{ value: 'm', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryM = {
        id: hashContext(['x', 'y', 'z', 'm']),
        context: ['x', 'y', 'z', 'm'],
        children: [],
        lastUpdated: timestamp(),
      }

      await provider.updateThoughtIndex({
        [hashThought('x')]: thoughtX,
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
        [hashThought('m')]: thoughtM,
      })

      await provider.updateContextIndex({
        [hashContext(['x'])]: parentEntryX,
        [hashContext(['x', 'y'])]: parentEntryY,
        [hashContext(['x', 'y', 'z'])]: parentEntryZ,
        [hashContext(['x', 'y', 'z', 'm'])]: parentEntryM,
      })

      // only fetch 1 level of descendants
      const it = getDescendantThoughts(provider, ['x'], { maxDepth: 1 })
      const thoughtChunks = await all(it)
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts).toHaveProperty('contextIndex')

      expect(thoughts.contextIndex[hashContext(['x'])]).toEqual(parentEntryX)

      // children are pending
      expect(thoughts.contextIndex[hashContext(['x', 'y'])]).toEqual({
        id: parentEntryY.id,
        context: ['x', 'y'],
        children: [],
        lastUpdated: never(),
        pending: true,
      })

      expect(thoughts).toHaveProperty('thoughtIndex')

      expect(thoughts.thoughtIndex).toEqual({
        [hashThought('x')]: thoughtX,
        [hashThought('y')]: thoughtY,
      })

    })

    test('maxDepth: 2', async () => {

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
          context: ['x'],
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

      const thoughtM = {
        id: hashThought('m'),
        value: 'm',
        rank: 0,
        contexts: [{
          context: ['x', 'y', 'z'],
          rank: 0,
          lastUpdated: timestamp(),
        }],
        created: timestamp(),
        lastUpdated: timestamp()
      }

      const parentEntryX = {
        id: hashContext(['x']),
        context: ['x'],
        children: [{ value: 'y', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryY = {
        id: hashContext(['x', 'y']),
        context: ['x', 'y'],
        children: [{ value: 'z', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryZ = {
        id: hashContext(['x', 'y', 'z']),
        context: ['x', 'y', 'z'],
        children: [{ value: 'm', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryM = {
        id: hashContext(['x', 'y', 'z', 'm']),
        context: ['x', 'y', 'z', 'm'],
        children: [],
        lastUpdated: timestamp(),
      }

      await provider.updateThoughtIndex({
        [hashThought('x')]: thoughtX,
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
        [hashThought('m')]: thoughtM,
      })

      await provider.updateContextIndex({
        [hashContext(['x'])]: parentEntryX,
        [hashContext(['x', 'y'])]: parentEntryY,
        [hashContext(['x', 'y', 'z'])]: parentEntryZ,
        [hashContext(['x', 'y', 'z', 'm'])]: parentEntryM,
      })

      // only fetch 2 levels of descendants
      const thoughtChunks = await all(getDescendantThoughts(provider, ['x'], { maxDepth: 2 }))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts).toHaveProperty('contextIndex')

      expect(thoughts.contextIndex[hashContext(['x'])]).toEqual(parentEntryX)
      expect(thoughts.contextIndex[hashContext(['x', 'y'])]).toEqual(parentEntryY)

      // grandchildren are pending
      expect(thoughts.contextIndex[hashContext(['x', 'y', 'z'])]).toEqual({
        id: parentEntryZ.id,
        context: ['x', 'y', 'z'],
        children: [],
        lastUpdated: never(),
        pending: true,
      })

      expect(thoughts).toHaveProperty('thoughtIndex')

      expect(thoughts.thoughtIndex).toEqual({
        [hashThought('x')]: thoughtX,
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
        rank: 0,
        contexts: [],
        created: timestamp(),
        lastUpdated: timestamp(),
      }

      const thoughtY = {
        id: hashThought('y'),
        value: 'y',
        rank: 0,
        contexts: [{
          context: ['x'],
          rank: 0,
          lastUpdated: timestamp(),
        }],
        created: timestamp(),
        lastUpdated: timestamp(),
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
        lastUpdated: timestamp(),
      }

      const thoughtM = {
        id: hashThought('m'),
        value: 'm',
        rank: 0,
        contexts: [{
          context: ['t', 'u', 'v'],
          rank: 0,
          lastUpdated: timestamp(),
        }],
        created: timestamp(),
        lastUpdated: timestamp(),
      }

      const thoughtN = {
        id: hashThought('n'),
        value: 'n',
        rank: 0,
        contexts: [{
          context: ['t', 'u', 'v', 'm'],
          rank: 0,
          lastUpdated: timestamp(),
        }],
        created: timestamp(),
        lastUpdated: timestamp(),
      }

      const parentEntryX = {
        id: hashContext(['x']),
        context: ['x'],
        children: [{ value: 'y', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryY = {
        id: hashContext(['x', 'y']),
        context: ['x', 'y'],
        children: [{ value: 'z', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryZ = {
        id: hashContext(['x', 'y', 'z']),
        context: ['x', 'y', 'z'],
        children: [],
        lastUpdated: timestamp(),
      }

      const parentEntryM = {
        id: hashContext(['t', 'u', 'v', 'm']),
        context: ['t', 'u', 'v', 'm'],
        children: [{ value: 'n', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryN = {
        id: hashContext(['t', 'u', 'v', 'm', 'n']),
        context: ['t', 'u', 'v', 'm', 'n'],
        children: [],
        lastUpdated: timestamp(),
      }

      await provider.updateThoughtIndex({
        [hashThought('x')]: thoughtX,
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
        [hashThought('m')]: thoughtM,
        [hashThought('n')]: thoughtN,
      })

      await provider.updateContextIndex({
        [hashContext(['x'])]: parentEntryX,
        [hashContext(['x', 'y'])]: parentEntryY,
        [hashContext(['x', 'y', 'z'])]: parentEntryZ,
        [hashContext(['t', 'u', 'v', 'm'])]: parentEntryM,
        [hashContext(['t', 'u', 'v', 'm', 'n'])]: parentEntryN,
      })

      const thoughtChunks = await all(getManyDescendants(provider, {
        [hashContext(['x'])]: ['x'],
        [hashContext(['t', 'u', 'v', 'm'])]: ['t', 'u', 'v', 'm'],
      }))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts).toHaveProperty('contextIndex')

      expect(thoughts.contextIndex[hashContext(['x'])]).toEqual(parentEntryX)
      expect(thoughts.contextIndex[hashContext(['x', 'y'])]).toEqual(parentEntryY)
      expect(thoughts.contextIndex[hashContext(['x', 'y', 'z'])]).toEqual(parentEntryZ)
      expect(thoughts.contextIndex[hashContext(['t', 'u', 'v', 'm'])]).toEqual(parentEntryM)
      expect(thoughts.contextIndex[hashContext(['t', 'u', 'v', 'm', 'n'])]).toEqual(parentEntryN)

      expect(thoughts).toHaveProperty('thoughtIndex')

      expect(thoughts.thoughtIndex).toEqual({
        [hashThought('x')]: thoughtX,
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
        [hashThought('m')]: thoughtM,
        [hashThought('n')]: thoughtN,
      })

    })

    test('maxDepth', async () => {

      const thoughtX = {
        id: hashThought('x'),
        value: 'x',
        rank: 0,
        contexts: [],
        created: timestamp(),
        lastUpdated: timestamp(),
      }

      const thoughtY = {
        id: hashThought('y'),
        value: 'y',
        rank: 0,
        contexts: [{
          context: ['x'],
          rank: 0,
          lastUpdated: timestamp(),
        }],
        created: timestamp(),
        lastUpdated: timestamp(),
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
        lastUpdated: timestamp(),
      }

      const thoughtM = {
        id: hashThought('m'),
        value: 'm',
        rank: 0,
        contexts: [{
          context: ['t', 'u', 'v'],
          rank: 0,
          lastUpdated: timestamp(),
        }],
        created: timestamp(),
        lastUpdated: timestamp(),
      }

      const thoughtN = {
        id: hashThought('n'),
        value: 'n',
        rank: 0,
        contexts: [{
          context: ['t', 'u', 'v', 'm'],
          rank: 0,
          lastUpdated: timestamp(),
        }],
        created: timestamp(),
        lastUpdated: timestamp(),
      }

      const parentEntryX = {
        id: hashContext(['x']),
        context: ['x'],
        children: [{ value: 'y', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryY = {
        id: hashContext(['x', 'y']),
        context: ['x', 'y'],
        children: [{ value: 'z', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryZ = {
        id: hashContext(['x', 'y', 'z']),
        context: ['x', 'y', 'z'],
        children: [],
        lastUpdated: timestamp(),
      }

      const parentEntryM = {
        id: hashContext(['t', 'u', 'v', 'm']),
        context: ['t', 'u', 'v', 'm'],
        children: [{ value: 'n', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryN = {
        id: hashContext(['t', 'u', 'v', 'm', 'n']),
        context: ['t', 'u', 'v', 'm', 'n'],
        children: [],
        lastUpdated: timestamp(),
      }

      await provider.updateThoughtIndex({
        [hashThought('x')]: thoughtX,
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
        [hashThought('m')]: thoughtM,
        [hashThought('n')]: thoughtN,
      })

      await provider.updateContextIndex({
        [hashContext(['x'])]: parentEntryX,
        [hashContext(['x', 'y'])]: parentEntryY,
        [hashContext(['x', 'y', 'z'])]: parentEntryZ,
        [hashContext(['t', 'u', 'v', 'm'])]: parentEntryM,
        [hashContext(['t', 'u', 'v', 'm', 'n'])]: parentEntryN,
      })

      const thoughtChunks = await all(getManyDescendants(provider, {
        [hashContext(['x'])]: ['x'],
        [hashContext(['t', 'u', 'v', 'm'])]: ['t', 'u', 'v', 'm'],
      }, { maxDepth: 2 }))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts).toHaveProperty('contextIndex')

      expect(thoughts.contextIndex[hashContext(['x'])]).toEqual(parentEntryX)
      expect(thoughts.contextIndex[hashContext(['x', 'y'])]).toEqual(parentEntryY)
      expect(thoughts.contextIndex[hashContext(['x', 'y', 'z'])]).toEqual({
        ...parentEntryZ,
        lastUpdated: never(),
        pending: true,
      })
      expect(thoughts.contextIndex[hashContext(['t', 'u', 'v', 'm'])]).toEqual(parentEntryM)
      expect(thoughts.contextIndex[hashContext(['t', 'u', 'v', 'm', 'n'])]).toEqual(parentEntryN)

      expect(thoughts).toHaveProperty('thoughtIndex')

      expect(thoughts.thoughtIndex).toEqual({
        [hashThought('x')]: thoughtX,
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
        [hashThought('m')]: thoughtM,
        [hashThought('n')]: thoughtN,
      })

    })

    test('ignore maxDepth on EM context', async () => {

      const thoughtEM = {
        id: hashThought(EM_TOKEN),
        value: EM_TOKEN,
        rank: 0,
        contexts: [],
        created: timestamp(),
        lastUpdated: timestamp(),
      }

      const thoughtY = {
        id: hashThought('y'),
        value: 'y',
        rank: 0,
        contexts: [{
          context: [EM_TOKEN],
          rank: 0,
          lastUpdated: timestamp(),
        }],
        created: timestamp(),
        lastUpdated: timestamp(),
      }

      const thoughtZ = {
        id: hashThought('z'),
        value: 'z',
        rank: 0,
        contexts: [{
          context: [EM_TOKEN, 'y'],
          rank: 0,
          lastUpdated: timestamp(),
        }],
        created: timestamp(),
        lastUpdated: timestamp(),
      }

      const thoughtM = {
        id: hashThought('m'),
        value: 'm',
        rank: 0,
        contexts: [{
          context: ['t', 'u', 'v'],
          rank: 0,
          lastUpdated: timestamp(),
        }],
        created: timestamp(),
        lastUpdated: timestamp(),
      }

      const thoughtN = {
        id: hashThought('n'),
        value: 'n',
        rank: 0,
        contexts: [{
          context: ['t', 'u', 'v', 'm'],
          rank: 0,
          lastUpdated: timestamp(),
        }],
        created: timestamp(),
        lastUpdated: timestamp(),
      }

      const parentEntryEM = {
        id: hashContext([EM_TOKEN]),
        context: [EM_TOKEN],
        children: [{ value: 'y', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryY = {
        id: hashContext([EM_TOKEN, 'y']),
        context: [EM_TOKEN, 'y'],
        children: [{ value: 'z', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryZ = {
        id: hashContext([EM_TOKEN, 'y', 'z']),
        context: [EM_TOKEN, 'y', 'z'],
        children: [],
        lastUpdated: timestamp(),
      }

      const parentEntryM = {
        id: hashContext(['t', 'u', 'v', 'm']),
        context: ['t', 'u', 'v', 'm'],
        children: [{ value: 'n', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryN = {
        id: hashContext(['t', 'u', 'v', 'm', 'n']),
        context: ['t', 'u', 'v', 'm', 'n'],
        children: [],
        lastUpdated: timestamp(),
      }

      await provider.updateThoughtIndex({
        [hashThought(EM_TOKEN)]: thoughtEM,
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
        [hashThought('m')]: thoughtM,
        [hashThought('n')]: thoughtN,
      })

      await provider.updateContextIndex({
        [hashContext([EM_TOKEN])]: parentEntryEM,
        [hashContext([EM_TOKEN, 'y'])]: parentEntryY,
        [hashContext([EM_TOKEN, 'y', 'z'])]: parentEntryZ,
        [hashContext(['t', 'u', 'v', 'm'])]: parentEntryM,
        [hashContext(['t', 'u', 'v', 'm', 'n'])]: parentEntryN,
      })

      const thoughtChunks = await all(getManyDescendants(provider, {
        [hashContext([EM_TOKEN])]: [EM_TOKEN],
        [hashContext(['t', 'u', 'v', 'm'])]: ['t', 'u', 'v', 'm'],
      }, { maxDepth: 1 }))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts).toHaveProperty('contextIndex')

      expect(thoughts.contextIndex[hashContext([EM_TOKEN])]).toEqual(parentEntryEM)
      expect(thoughts.contextIndex[hashContext([EM_TOKEN, 'y'])]).toEqual(parentEntryY)
      expect(thoughts.contextIndex[hashContext([EM_TOKEN, 'y', 'z'])]).toEqual(parentEntryZ)
      expect(thoughts.contextIndex[hashContext(['t', 'u', 'v', 'm'])]).toEqual(parentEntryM)
      // still uses maxDepth on non-EM contexts
      expect(thoughts.contextIndex[hashContext(['t', 'u', 'v', 'm', 'n'])]).toEqual({
        ...parentEntryN,
        lastUpdated: never(),
        pending: true,
      })

      expect(thoughts).toHaveProperty('thoughtIndex')

      expect(thoughts.thoughtIndex).toEqual({
        [hashThought(EM_TOKEN)]: thoughtEM,
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
        [hashThought('m')]: thoughtM,
        [hashThought('n')]: thoughtN,
      })

    })

    test('ignore maxDepth on metaprogramming attributes', async () => {

      const thoughtX = {
        id: hashThought('x'),
        value: 'x',
        contexts: [],
        created: timestamp(),
        lastUpdated: timestamp()
      }

      const thoughtY = {
        id: hashThought('y'),
        value: 'y',
        contexts: [{
          context: ['x'],
          rank: 0,
          lastUpdated: timestamp(),
        }],
        created: timestamp(),
        lastUpdated: timestamp()
      }

      const thoughtNote = {
        id: hashThought('=note'),
        value: '=note',
        contexts: [{
          context: ['x', 'y'],
          rank: 1,
          lastUpdated: timestamp(),
        }],
        created: timestamp(),
        lastUpdated: timestamp()
      }

      const thoughtContent = {
        id: hashThought('content'),
        value: 'content',
        contexts: [{
          context: ['x', 'y', '=note'],
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

      const thoughtM = {
        id: hashThought('m'),
        value: 'm',
        contexts: [{
          context: ['x', 'y', 'z'],
          rank: 0,
          lastUpdated: timestamp(),
        }],
        created: timestamp(),
        lastUpdated: timestamp()
      }

      const parentEntryX = {
        id: hashContext(['x']),
        context: ['x'],
        children: [{ value: 'y', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryY = {
        id: hashContext(['x', 'y']),
        context: ['x', 'y'],
        children: [
          { value: 'z', rank: 0 },
          { value: '=note', rank: 1 },
        ],
        lastUpdated: timestamp(),
      }

      const parentEntryNote = {
        id: hashContext(['x', 'y', '=note']),
        context: ['x', 'y', '=note'],
        children: [{ value: 'content', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryNoteContent = {
        id: hashContext(['x', 'y', '=note', 'content']),
        context: ['x', 'y', '=note', 'content'],
        children: [],
        lastUpdated: timestamp(),
      }

      const parentEntryZ = {
        id: hashContext(['x', 'y', 'z']),
        context: ['x', 'y', 'z'],
        children: [{ value: 'm', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryM = {
        id: hashContext(['x', 'y', 'z', 'm']),
        context: ['x', 'y', 'z', 'm'],
        children: [],
        lastUpdated: timestamp(),
      }

      await provider.updateThoughtIndex({
        [hashThought('x')]: thoughtX,
        [hashThought('y')]: thoughtY,
        [hashThought('=note')]: thoughtNote,
        [hashThought('content')]: thoughtContent,
        [hashThought('z')]: thoughtZ,
        [hashThought('m')]: thoughtM,
      })

      await provider.updateContextIndex({
        [hashContext(['x'])]: parentEntryX,
        [hashContext(['x', 'y'])]: parentEntryY,
        [hashContext(['x', 'y', '=note'])]: parentEntryNote,
        [hashContext(['x', 'y', '=note', 'content'])]: parentEntryNoteContent,
        [hashContext(['x', 'y', 'z'])]: parentEntryZ,
        [hashContext(['x', 'y', 'z', 'm'])]: parentEntryM,
      })

      // only fetch 1 level of descendants
      const it = getDescendantThoughts(provider, ['x'], { maxDepth: 1 })
      const thoughtChunks = await all(it)
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts).toHaveProperty('contextIndex')

      expect(thoughts.contextIndex[hashContext(['x'])]).toEqual(parentEntryX)

      expect(thoughts.contextIndex[hashContext(['x', 'y'])]).toEqual({
        ...parentEntryY,
        children: [{ value: '=note', rank: 1 }],
        lastUpdated: never(),
        pending: true,
      })

      expect(thoughts.contextIndex[hashContext(['x', 'y', '=note'])]).toEqual(parentEntryNote)

      expect(thoughts).toHaveProperty('thoughtIndex')

      expect(thoughts.thoughtIndex).toEqual({
        [hashThought('x')]: thoughtX,
        [hashThought('y')]: thoughtY,
        [hashThought('=note')]: thoughtNote,
        [hashThought('content')]: thoughtContent,
      })

    })

  })

}

export default dataProviderTest
