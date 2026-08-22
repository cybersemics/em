import { applyPatch } from 'fast-json-patch'
import { produce } from 'immer'
import { sortBy, startCase, uniq } from 'lodash'
import ActionType from '../@types/ActionType'
import Patch from '../@types/Patch'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { HOME_TOKEN } from '../constants'
import { isNavigation } from '../util/actionMetadata.registry'
import head from '../util/head'
import headValue from '../util/headValue'
import isRoot from '../util/isRoot'
import removeHome from '../util/removeHome'
import documentSort from './documentSort'
import exportContext from './exportContext'
import { getChildrenRanked } from './getChildren'
import undoSteps from './undoSteps'

/** A patch with the states before and after it. */
interface Snapshot {
  patch: Patch
  before: State
  after: State
}

/** Describes a patch in terms of the thoughts it changed, as a step the user can follow. The patch records only the types of the actions that produced it, so what they did is read off its operations and the states on either side of it. */
type Describer = (snapshot: Snapshot) => string

/** Formats a thought value as inline code. */
const code = (value: string) => `\`${value}\``

/** Formats the value of the thought at the given path as inline code preceded by a space, or returns an empty string if there is no such thought so that a description reads naturally either way. */
const target = (state: State, path: Path | null): string => {
  const value = path ? headValue(state, path) : undefined
  return value !== undefined ? ` ${code(value)}` : ''
}

/** The ids of the thoughts whose entries a patch touches, from its operation paths. */
const touchedIds = (patch: Patch): ThoughtId[] =>
  uniq(patch.flatMap(op => op.path.match(/^\/thoughts\/thoughtIndex\/([^/]+)/)?.[1] ?? [])) as ThoughtId[]

/** The ids of the thoughts that exist after a patch but not before it, i.e. that its actions created. */
const createdIds = ({ patch, before, after }: Snapshot): ThoughtId[] =>
  touchedIds(patch).filter(id => !before.thoughts.thoughtIndex[id] && after.thoughts.thoughtIndex[id])

/** The ids of the thoughts that exist before a patch but not after it, i.e. that its actions deleted. */
const deletedIds = ({ patch, before, after }: Snapshot): ThoughtId[] =>
  touchedIds(patch).filter(id => before.thoughts.thoughtIndex[id] && !after.thoughts.thoughtIndex[id])

/** The topmost of a set of thoughts in the given state, i.e. one whose parent is not in the set. */
const topmost = (state: State, ids: ThoughtId[]): ThoughtId | undefined =>
  ids.find(id => !ids.includes(state.thoughts.thoughtIndex[id].parentId))

/** Describes where a thought sits in the given state relative to its siblings, or its parent when it has none, e.g. " after `b`". */
const placement = (state: State, id: ThoughtId): string => {
  const { parentId } = state.thoughts.thoughtIndex[id]
  const siblings = getChildrenRanked(state, parentId)
  const i = siblings.findIndex(sibling => sibling.id === id)
  const previous = siblings[i - 1]
  const next = siblings[i + 1]
  return previous
    ? ` after ${code(previous.value)}`
    : next
      ? ` before ${code(next.value)}`
      : isRoot([parentId])
        ? ''
        : ` as a subthought of ${code(state.thoughts.thoughtIndex[parentId]?.value ?? '')}`
}

/** Describes the creation of a thought, reading its value from the given state so that a value typed by a later patch of the same step can be used. */
const describeNewThought = (snapshot: Snapshot, state: State): string => {
  const id = topmost(snapshot.after, createdIds(snapshot))
  const value = id && state.thoughts.thoughtIndex[id]?.value
  return `Create ${value ? `thought ${code(value)}` : 'a new thought'}${id ? placement(snapshot.after, id) : ''}.`
}

/** Describes an edit by the first thought whose value the patch changed. Contiguous edits are merged into one patch, so this reads as a single edit from the first old value to the last new value. */
const describeEdit = ({ patch, before, after }: Snapshot): string => {
  const id = touchedIds(patch).find(id => {
    const oldValue = before.thoughts.thoughtIndex[id]?.value
    const newValue = after.thoughts.thoughtIndex[id]?.value
    return oldValue !== undefined && newValue !== undefined && oldValue !== newValue
  })
  return id
    ? `Edit ${code(before.thoughts.thoughtIndex[id].value)} to ${code(after.thoughts.thoughtIndex[id].value)}.`
    : `Edit${target(before, before.cursor)}.`
}

/** Describes a deletion by the topmost deleted thought, falling back to the cursor. */
const describeDelete = (snapshot: Snapshot): string => {
  const id = topmost(snapshot.before, deletedIds(snapshot))
  return `Delete${id ? ` ${code(snapshot.before.thoughts.thoughtIndex[id].value)}` : target(snapshot.before, snapshot.before.cursor)}.`
}

/** Hand-written descriptions of the core editing actions. Any other action falls back to its name and the cursor thought. */
const describers: Partial<Record<ActionType, Describer>> = {
  archiveThought: ({ before }) => `Archive${target(before, before.cursor)}.`,
  categorize: ({ before }) => `Categorize${target(before, before.cursor)}.`,
  deleteThought: describeDelete,
  deleteThoughtWithCursor: describeDelete,
  editThought: describeEdit,
  importText: snapshot => {
    const { after } = snapshot
    const created = createdIds(snapshot)
    const roots = sortBy(
      created.filter(id => !created.includes(after.thoughts.thoughtIndex[id].parentId)),
      id => after.thoughts.thoughtIndex[id].rank,
    )
    // A single-line paste only changes the value of the thought it is pasted into.
    if (!roots.length) return describeEdit(snapshot)
    const parentId = after.thoughts.thoughtIndex[roots[0]].parentId
    const destination = isRoot([parentId]) ? '' : ` into ${code(after.thoughts.thoughtIndex[parentId]?.value ?? '')}`
    // The pasted thoughts are quoted in a code block indented under the step, so that the markdown list continues after it.
    return `Paste${destination}:\n\n   \`\`\`\n${roots
      .map(id => exportContext(after, id, 'text/plain'))
      .join('\n')
      .split('\n')
      .map(line => `   ${line}`)
      .join('\n')}\n   \`\`\``
  },
  indent: ({ before }) => `Indent${target(before, before.cursor)}.`,
  join: ({ before }) => `Join${target(before, before.cursor)} with its siblings.`,
  moveThoughtDown: ({ before }) => `Move${target(before, before.cursor)} down.`,
  moveThoughtUp: ({ before }) => `Move${target(before, before.cursor)} up.`,
  newThought: snapshot => describeNewThought(snapshot, snapshot.after),
  outdent: ({ before }) => `Outdent${target(before, before.cursor)}.`,
  splitThought: snapshot => {
    const { before, after } = snapshot
    const left = before.cursor ? after.thoughts.thoughtIndex[head(before.cursor)]?.value : undefined
    const created = createdIds(snapshot)[0]
    const right = created && after.thoughts.thoughtIndex[created]?.value
    return `Split${target(before, before.cursor)}${left !== undefined && right !== undefined ? ` into ${code(left)} and ${code(right)}` : ''}.`
  },
  uncategorize: ({ before }) => `Uncategorize${target(before, before.cursor)}.`,
}

/** Describes a patch from the types of the actions that produced it. Returns an empty string for a patch of navigation actions only, which is implied by the step it accompanies. */
const describePatch = (snapshot: Snapshot): string => {
  const { before } = snapshot
  const { actions } = snapshot.patch[0]

  // A multicursor command bundles every action it dispatched into one patch, whose first action is the command's undoLabel. Name the command and the thoughts that were selected.
  if (actions.includes('setIsMulticursorExecuting')) {
    const values = documentSort(before, Object.values(before.multicursors)).map(path => headValue(before, path) ?? '')
    return `${startCase(actions[0])}${values.length ? ` ${values.map(code).join(', ')}` : ''}.`
  }

  const type = actions.find(action => !isNavigation(action))
  if (!type) return ''

  const describe = describers[type]
  return describe ? describe(snapshot) : `${startCase(type)}${target(before, before.cursor)}.`
}

/** Describes a step from the snapshots of its patches in chronological order. */
const describeStep = (snapshots: Snapshot[]): string => {
  const [created, typed] = snapshots
  // A new thought followed by typing its value reads as a single creation, e.g. "Create thought `c` after `b`."
  return created.patch[0].actions[0] === 'newThought' && typed
    ? describeNewThought(created, typed.after)
    : snapshots.map(describePatch).filter(Boolean).join(' ')
}

/** Generates the steps to reproduce the actions between two positions of the undo history as markdown: the thoughtspace at the start position in a code block, followed by a numbered step for each action up to the end position. Positions count steps back from the present, so start is at or before end. */
const stepsToReproduce = (state: State, { start, end }: { start: number; end: number }): string => {
  const { steps, position } = undoSteps(state)

  // Reconstruct the state before and after each patch between the current state and the two positions.
  // The undo stack holds inverse patches, applied newest first to walk back to the start.
  const undoSnapshots = steps
    .slice(position, start)
    .flatMap(step => [...step.patches].reverse())
    .reduce<Snapshot[]>((snapshots, patch) => {
      const after = snapshots.at(-1)?.before ?? state
      return [...snapshots, { patch, before: produce(after, draft => applyPatch(draft, patch).newDocument), after }]
    }, [])
  // The redo stack holds forward patches, applied oldest first to walk forward to the end.
  const redoSnapshots = steps
    .slice(end, position)
    .reverse()
    .flatMap(step => step.patches)
    .reduce<Snapshot[]>((snapshots, patch) => {
      const before = snapshots.at(-1)?.after ?? state
      return [...snapshots, { patch, before, after: produce(before, draft => applyPatch(draft, patch).newDocument) }]
    }, [])
  const snapshots = new Map([...undoSnapshots, ...redoSnapshots].map(snapshot => [snapshot.patch, snapshot]))

  // The state at the start position is the current state, the state before the oldest patch of the step ahead of it, or the state after the newest patch of the step behind it.
  const stateAtStart =
    start === position
      ? state
      : start > position
        ? snapshots.get(steps[start - 1].patches[0])!.before
        : snapshots.get(steps[start].patches.at(-1)!)!.after

  // removeHome wraps the children of the root in newlines
  const tree = removeHome(exportContext(stateAtStart, [HOME_TOKEN], 'text/plain')).replace(/^\n|\n$/g, '')
  const descriptions = steps
    .slice(end, start)
    .reverse()
    .map(step => describeStep(step.patches.map(patch => snapshots.get(patch)!)))
    .filter(Boolean)

  return `\`\`\`\n${tree}\n\`\`\`${descriptions.length ? `\n\n${descriptions.map((description, i) => `${i + 1}. ${description}`).join('\n')}` : ''}`
}

export default stepsToReproduce
