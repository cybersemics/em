import { EM_TOKEN, ROOT_TOKEN } from '../constants'
import { hashContext, hashThought, never, timestamp } from '../util'
import { DataProvider } from '../types'

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

    await provider.updateThought(hashThought('x'), thoughtX)
    await provider.updateThought(hashThought('y'), thoughtY)

    const dbThoughts = await provider.getThoughtsByIds([hashThought('x'), hashThought('y')])

    // does not preserve order
    expect(dbThoughts).toEqual(
      expect.arrayContaining([thoughtX, thoughtY])
    )
  })

  test('updateThought', async () => {

    const nothought = await provider.getThought('x')
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

    const remoteThought = await provider.getThought('x')
    expect(remoteThought).toEqual(thought)
  })

  test('getContext', async () => {

    const nocontext = await provider.getContext(['x'])
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

    await provider.updateContext(hashContext(['x']), parentEntry)

    const dbContext = await provider.getContext(['x'])
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

    await provider.updateThoughtIndex({
      [hashThought(thoughtX.value)]: thoughtX,
      [hashThought(thoughtY.value)]: thoughtY,
    })

    const dbThought1 = await provider.getThought(thoughtX.value)
    expect(dbThought1).toEqual(thoughtX)

    const dbThought2 = await provider.getThought(thoughtY.value)
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

    await provider.updateContextIndex({
      [hashContext(['x'])]: parentEntryX,
      [hashContext(['y'])]: parentEntryY,
    })

    const contextX = await provider.getContext(['x'])
    expect(contextX).toEqual({
      ...parentEntryX,
      id: hashContext(['x']),
    })

    const contextY = await provider.getContext(['y'])
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

      const thoughts = await provider.getDescendantThoughts(['x'])

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
        children: [{ value: 'x', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryX = {
        id: hashContext(['x']),
        children: [{ value: 'y', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryY = {
        id: hashContext(['x', 'y']),
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

      const thoughts = await provider.getDescendantThoughts([ROOT_TOKEN])

      expect(thoughts).toHaveProperty('contextIndex')

      expect(thoughts.contextIndex).toEqual({
        [hashContext([ROOT_TOKEN])]: parentEntryRoot,
        [hashContext(['x'])]: parentEntryX,
        [hashContext(['x', 'y'])]: parentEntryY,
      })

      expect(thoughts).toHaveProperty('thoughtIndex')

      expect(thoughts.thoughtIndex).toEqual({
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

      await provider.updateThoughtIndex({
        [hashThought('x')]: thoughtX,
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
      })

      await provider.updateContextIndex({
        [hashContext(['x'])]: parentEntryX,
        [hashContext(['x', 'y'])]: parentEntryY,
        [hashContext(['x', 'y', 'z'])]: parentEntryZ,
      })

      // only fetch 1 level of descendants
      const thoughts = await provider.getDescendantThoughts(['x'], { maxDepth: 1 })

      expect(thoughts).toHaveProperty('contextIndex')

      expect(thoughts.contextIndex![hashContext(['x'])]).toEqual(parentEntryX)

      // children are pending
      expect(thoughts.contextIndex![hashContext(['x', 'y'])]).toEqual({
        children: [],
        lastUpdated: never(),
        pending: true,
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
        children: [{ value: 'm', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryM = {
        id: hashContext(['x', 'y', 'z', 'm']),
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
      const thoughts = await provider.getDescendantThoughts(['x'], { maxDepth: 2 })

      expect(thoughts).toHaveProperty('contextIndex')

      expect(thoughts.contextIndex![hashContext(['x'])]).toEqual(parentEntryX)
      expect(thoughts.contextIndex![hashContext(['x', 'y'])]).toEqual(parentEntryY)

      // grandchildren are pending
      expect(thoughts.contextIndex![hashContext(['x', 'y', 'z'])]).toEqual({
        children: [],
        lastUpdated: '',
        pending: true,
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

      const parentEntryM = {
        id: hashContext(['t', 'u', 'v', 'm']),
        children: [{ value: 'n', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryN = {
        id: hashContext(['t', 'u', 'v', 'm', 'n']),
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

      const thoughts = await provider.getManyDescendants({
        [hashContext(['x'])]: ['x'],
        [hashContext(['t', 'u', 'v', 'm'])]: ['t', 'u', 'v', 'm'],
      })

      expect(thoughts).toHaveProperty('contextIndex')

      expect(thoughts.contextIndex![hashContext(['x'])]).toEqual(parentEntryX)
      expect(thoughts.contextIndex![hashContext(['x', 'y'])]).toEqual(parentEntryY)
      expect(thoughts.contextIndex![hashContext(['x', 'y', 'z'])]).toEqual(parentEntryZ)
      expect(thoughts.contextIndex![hashContext(['t', 'u', 'v', 'm'])]).toEqual(parentEntryM)
      expect(thoughts.contextIndex![hashContext(['t', 'u', 'v', 'm', 'n'])]).toEqual(parentEntryN)

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

      const parentEntryM = {
        id: hashContext(['t', 'u', 'v', 'm']),
        children: [{ value: 'n', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryN = {
        id: hashContext(['t', 'u', 'v', 'm', 'n']),
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

      const thoughts = await provider.getManyDescendants({
        [hashContext(['x'])]: ['x'],
        [hashContext(['t', 'u', 'v', 'm'])]: ['t', 'u', 'v', 'm'],
      }, { maxDepth: 2 })

      expect(thoughts).toHaveProperty('contextIndex')

      expect(thoughts.contextIndex![hashContext(['x'])]).toEqual(parentEntryX)
      expect(thoughts.contextIndex![hashContext(['x', 'y'])]).toEqual(parentEntryY)
      expect(thoughts.contextIndex![hashContext(['x', 'y', 'z'])]).toEqual({
        children: [],
        lastUpdated: never(),
        pending: true,
      })
      expect(thoughts.contextIndex![hashContext(['t', 'u', 'v', 'm'])]).toEqual(parentEntryM)
      expect(thoughts.contextIndex![hashContext(['t', 'u', 'v', 'm', 'n'])]).toEqual(parentEntryN)

      expect(thoughts).toHaveProperty('thoughtIndex')

      expect(thoughts.thoughtIndex).toEqual({
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
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
        children: [{ value: 'y', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryY = {
        id: hashContext([EM_TOKEN, 'y']),
        children: [{ value: 'z', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryZ = {
        id: hashContext([EM_TOKEN, 'y', 'z']),
        children: [],
        lastUpdated: timestamp(),
      }

      const parentEntryM = {
        id: hashContext(['t', 'u', 'v', 'm']),
        children: [{ value: 'n', rank: 0 }],
        lastUpdated: timestamp(),
      }

      const parentEntryN = {
        id: hashContext(['t', 'u', 'v', 'm', 'n']),
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

      const thoughts = await provider.getManyDescendants({
        [hashContext([EM_TOKEN])]: [EM_TOKEN],
        [hashContext(['t', 'u', 'v', 'm'])]: ['t', 'u', 'v', 'm'],
      }, { maxDepth: 1 })

      expect(thoughts).toHaveProperty('contextIndex')

      expect(thoughts.contextIndex![hashContext([EM_TOKEN])]).toEqual(parentEntryEM)
      expect(thoughts.contextIndex![hashContext([EM_TOKEN, 'y'])]).toEqual(parentEntryY)
      expect(thoughts.contextIndex![hashContext([EM_TOKEN, 'y', 'z'])]).toEqual(parentEntryZ)
      expect(thoughts.contextIndex![hashContext(['t', 'u', 'v', 'm'])]).toEqual(parentEntryM)
      // still uses maxDepth on non-EM contexts
      expect(thoughts.contextIndex![hashContext(['t', 'u', 'v', 'm', 'n'])]).toEqual({
        children: [],
        lastUpdated: never(),
        pending: true,
      })

      expect(thoughts).toHaveProperty('thoughtIndex')

      expect(thoughts.thoughtIndex).toEqual({
        [hashThought('y')]: thoughtY,
        [hashThought('z')]: thoughtZ,
        [hashThought('n')]: thoughtN,
      })

    })

  })

}

export default dataProviderTest
