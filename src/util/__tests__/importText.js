import _ from 'lodash'
import { importHtml } from '../importText'

// constants
import {
  ROOT_TOKEN,
} from '../../constants'

// util
import {
  getThought,
  getThoughtsRanked,
  hashContext,
  hashThought,
} from '../../util'

const RANKED_ROOT = [{ value: ROOT_TOKEN, rank: 0 }]
const initialState = {
  state: {
    thoughtIndex: {
      [hashThought(ROOT_TOKEN)]: {
        value: ROOT_TOKEN,
        contexts: [],
      },
    },
    contextIndex: {
      [hashContext([ROOT_TOKEN])]: [],
    },
  }
}

/** Imports the given html into initialState and exposes getThought and getThoughtsRanked for testing */
const testImportHtml = html => {
  const {
    contextIndexUpdates: contextIndex,
    thoughtIndexUpdates: thoughtIndex,
  } = importHtml(RANKED_ROOT, html, initialState)
  return {
    getThought: value => getThought(value, thoughtIndex),
    getThoughtsRanked: context => getThoughtsRanked(context, thoughtIndex, contextIndex)
  }
}

it('simple', () => {
  const result = testImportHtml('test')
  const thought = result.getThought('test')
  const children = result.getThoughtsRanked([ROOT_TOKEN])
  expect(thought).toMatchObject({
    value: 'test',
    contexts: [{
      context: [ROOT_TOKEN],
      rank: 0
    }]
  })
  expect(children).toEqual(expect.arrayContaining([
    expect.objectContaining({
      value: 'test',
      rank: 0
    }
  )]))
})

it('simple li', () => {
  const result = testImportHtml('<li>test</li>')
  const thought = result.getThought('test')
  const children = result.getThoughtsRanked([ROOT_TOKEN])
  expect(thought).toMatchObject({
    value: 'test',
    contexts: [{
      context: [ROOT_TOKEN],
      rank: 0
    }]
  })
  expect(children).toEqual(expect.arrayContaining([
    expect.objectContaining({
      value: 'test',
      rank: 0
    }
  )]))
})

it('simple ul', () => {
  const result = testImportHtml('<ul><li>test</li></ul>')
  const thought = result.getThought('test')
  const children = result.getThoughtsRanked([ROOT_TOKEN])
  expect(thought).toMatchObject({
    value: 'test',
    contexts: [{
      context: [ROOT_TOKEN],
      rank: 0
    }]
  })
  expect(children).toEqual(expect.arrayContaining([
    expect.objectContaining({
      value: 'test',
      rank: 0
    }
  )]))
})

it('whitespace', () => {
  const result = testImportHtml('  test  ')
  const thought = result.getThought('test')
  const children = result.getThoughtsRanked([ROOT_TOKEN])
  expect(thought).toMatchObject({
    value: 'test',
    contexts: [{
      context: [ROOT_TOKEN],
      rank: 0
    }]
  })
  expect(children).toEqual(expect.arrayContaining([
    expect.objectContaining({
      value: 'test',
      rank: 0
    }
  )]))
})

it('multiple li\'s', () => {
  const result = testImportHtml(`
<li>one</li>
<li>two</li>
`)
  const one = result.getThought('one')
  const two = result.getThought('two')
  expect(one).toMatchObject({
    value: 'one',
    contexts: [{
      context: [ROOT_TOKEN],
      rank: 0
    }]
  })
  expect(two).toMatchObject({
    value: 'two',
    contexts: [{
      context: [ROOT_TOKEN],
      rank: 1
    }]
  })

  const children = result.getThoughtsRanked([ROOT_TOKEN])
  expect(children).toEqual(expect.arrayContaining([
    expect.objectContaining({
      value: 'one',
      rank: 0
    }),
    expect.objectContaining({
      value: 'two',
      rank: 1
    })
  ]))
})

it('nested li\'s', () => {
  const result = testImportHtml(`
<li>a<ul>
  <li>x</li>
  <li>y</li>
</ul></li>
`)
  const a = result.getThought('a')
  expect(a).toMatchObject({
    value: 'a',
    contexts: [{
      context: [ROOT_TOKEN],
      rank: 0
    }]
  })

  const x = result.getThought('x')
  expect(x).toMatchObject({
    value: 'x',
    contexts: [{
      context: ['a'],
      rank: 1
    }]
  })

  const y = result.getThought('y')
  expect(y).toMatchObject({
    value: 'y',
    contexts: [{
      context: ['a'],
      rank: 2
    }]
  })

  const childrenRoot = result.getThoughtsRanked([ROOT_TOKEN])
  expect(childrenRoot).toEqual(expect.arrayContaining([
    expect.objectContaining({
      value: 'a',
      rank: 0
    }),
  ]))

  const childrenA = result.getThoughtsRanked(['a'])
  expect(childrenA).toEqual(expect.arrayContaining([
    expect.objectContaining({
      value: 'x',
      rank: 1
    }),
    expect.objectContaining({
      value: 'y',
      rank: 2
    }),
  ]))
})

it('strip wrapping tag', () => {
  const result = testImportHtml('<span>test</span>')
  const children = result.getThoughtsRanked([ROOT_TOKEN])
  expect(children).toEqual(expect.arrayContaining([
    expect.objectContaining({
      value: 'test',
      rank: 0
    }
  )]))

  const thought = result.getThought('test')
  expect(thought).toMatchObject({
    value: 'test',
    contexts: [{
      context: [ROOT_TOKEN],
      rank: 0
    }]
  })
})

it('strip inline tag', () => {
  const result = testImportHtml('Hello, <span>Noosphere</span>')
  const children = result.getThoughtsRanked([ROOT_TOKEN])
  expect(children).toEqual(expect.arrayContaining([
    expect.objectContaining({
      value: 'Hello, Noosphere',
      rank: 0
    }
  )]))

  const thought = result.getThought('Hello, Noosphere')
  expect(thought).toMatchObject({
    value: 'Hello, Noosphere',
    contexts: [{
      context: [ROOT_TOKEN],
      rank: 0
    }]
  })
})

it('strip inline tag in nested list', () => {
  const value = 'one <b>and</b> two'
  const result = testImportHtml(`
<li>a<ul>
  <li>${value}</li>
  <li>y</li>
</ul></li>
`)
  const a = result.getThought('a')
  expect(a).toMatchObject({
    value: 'a',
    contexts: [{
      context: [ROOT_TOKEN],
      rank: 0
    }]
  })

  const x = result.getThought(value)
  expect(x).toMatchObject({
    value,
    contexts: [{
      context: ['a'],
      rank: 1
    }]
  })

  const y = result.getThought('y')
  expect(y).toMatchObject({
    value: 'y',
    contexts: [{
      context: ['a'],
      rank: 2
    }]
  })

  const childrenRoot = result.getThoughtsRanked([ROOT_TOKEN])
  expect(childrenRoot).toEqual(expect.arrayContaining([
    expect.objectContaining({
      value: 'a',
      rank: 0
    }),
  ]))

  const childrenA = result.getThoughtsRanked(['a'])
  expect(childrenA).toEqual(expect.arrayContaining([
    expect.objectContaining({
      value: 'x',
      rank: 1
    }),
    expect.objectContaining({
      value: 'y',
      rank: 2
    }),
  ]))
})

it('preserve formatting tags', () => {
  const value = '<b>one</b> and <i>two</i>'
  const result = testImportHtml(value)
  const children = result.getThoughtsRanked([ROOT_TOKEN])
  expect(children).toEqual(expect.arrayContaining([
    expect.objectContaining({
      value,
      rank: 0
    }
  )]))

  const thought = result.getThought(value)
  expect(thought).toMatchObject({
    value,
    contexts: [{
      context: [ROOT_TOKEN],
      rank: 0
    }]
  })
})
