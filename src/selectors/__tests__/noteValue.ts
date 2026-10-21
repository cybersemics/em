import editThought from '../../actions/editThought'
import importText from '../../actions/importText'
import moveThought from '../../actions/moveThought'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import appendToPath from '../../util/appendToPath'
import head from '../../util/head'
import initialState from '../../util/initialState'
import parentOf from '../../util/parentOf'
import pathToContext from '../../util/pathToContext'
import findDescendant from '../findDescendant'
import * as childrenSelectors from '../getChildren'
import noteValue from '../noteValue'
import resolveNotePath from '../resolveNotePath'

afterEach(vi.restoreAllMocks)

// https://github.com/cybersemics/em/issues/5303
it.each([
  ['names', 'Names'],
  ['NAMES', 'Names'],
  ['Names', '*Names*'],
  ['Names', '**Names**'],
  ['<b><i>NAMES</i></b>', 'Names'],
  ['<i>names</i>', '<b>Names</b>'],
])('resolves the note target %s against %s', (key, target) => {
  const state = importText(initialState(), {
    text: `
      - Reify
        - =note
          - =path
            - ${key}
        - ${target}
          - Bind Thought
          - Canonize`,
  })

  const path = contextToPathOrThrow(state, ['Reify'], 'noteValue')
  expect(noteValue(state, path)).toBe('Bind Thought, Canonize')
})

it('matches the visible text of an edited target containing an HTML entity', () => {
  const state = importText(initialState(), {
    text: `
      - Reify
        - =note
          - =path
            - A & B
        - Target
          - Content`,
  })
  const path = contextToPathOrThrow(state, ['Reify', 'Target'], 'noteValue')
  const edited = editThought(state, { path, oldValue: 'Target', newValue: '<b>A &amp; B</b>' })

  expect(noteValue(edited, parentOf(path))).toBe('Content')
})

it.each([
  ['Name', 'Names'],
  ['Resume', 'Résumé'],
  ['Names', 'Names!'],
  ['A and B', 'A & B'],
  ['AB', 'A B'],
  ['Names', 'Names😀'],
])('keeps the note target %s distinct from %s', (key, target) => {
  const state = importText(initialState(), {
    text: `
      - Reify
        - =note
          - =path
            - ${key}
        - ${target}
          - Unrelated`,
  })

  const path = contextToPathOrThrow(state, ['Reify'], 'noteValue')
  expect(noteValue(state, path)).toBeNull()
})

it.each(['names', 'Names'])('resolves %s to the first equivalent target by rank', key => {
  const state = importText(initialState(), {
    text: `
      - Reify
        - =note
          - =path
            - Names
        - Names
          - First
        - ${key}
          - Second`,
  })
  const path = contextToPathOrThrow(state, ['Reify'], 'noteValue')
  const target = childrenSelectors
    .getAllChildrenAsThoughts(state, head(path))
    .find(child => findDescendant(state, child.id, 'Second'))
  expect(target).toBeDefined()
  const targetPath = appendToPath(path, target!.id)
  const reordered = moveThought(state, { oldPath: targetPath, newPath: targetPath, newRank: -1 })

  expect(noteValue(reordered, path)).toBe('Second')
})

it('resolves equivalent targets in the configured note sort order', () => {
  const state = importText(initialState(), {
    text: `
      - Reify
        - =sort
          - Note
        - =note
          - =path
            - Names
        - Names
          - =note
            - Z
          - First
        - names
          - =note
            - A
          - Second`,
  })

  const path = contextToPathOrThrow(state, ['Reify'], 'noteValue')
  expect(noteValue(state, path)).toBe('Second')
})

it.each([
  { key: 'Missing', expected: null },
  { key: 'names', expected: ['Root', 'Names'] },
])('resolves $key without sorting unrelated notes', ({ key, expected }) => {
  const state = importText(initialState(), {
    text: `
      - Root
        - =sort
          - Note
        - =note
          - =path
            - ${key}
        - Names
          - Content
        - Other
          - =sort
            - Note
          - =note
            - =path
              - Missing
          - A
          - B`,
  })
  const path = contextToPathOrThrow(state, ['Root'], 'resolveNotePath')
  const sorted = vi.spyOn(childrenSelectors, 'getAllChildrenSorted')

  const resolved = resolveNotePath(state, path)

  expect(resolved && pathToContext(state, resolved)).toEqual(expected)
  // Note sorting resolves descendants' notes recursively, even when none can affect this lookup.
  expect(sorted).not.toHaveBeenCalled()
})

it('does not interpret a formatted attribute name as a literal note', () => {
  const state = importText(initialState(), {
    text: `
      - Reify
        - <b>=note</b>
          - Unrelated`,
  })

  const path = contextToPathOrThrow(state, ['Reify'], 'noteValue')
  expect(noteValue(state, path)).toBeNull()
})
