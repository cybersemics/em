import { applyPatch } from 'fast-json-patch'
import { produce } from 'immer'
import { findLast, startCase } from 'lodash'
import { UnknownAction } from 'redux'
import ActionType from '../@types/ActionType'
import Patch from '../@types/Patch'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { HOME_TOKEN } from '../constants'
import { isNavigation } from '../util/actionMetadata.registry'
import headValue from '../util/headValue'
import isRoot from '../util/isRoot'
import removeHome from '../util/removeHome'
import documentSort from './documentSort'
import exportContext from './exportContext'
import undoSteps from './undoSteps'

/** A patch with the states before and after it. */
interface Snapshot {
  patch: Patch
  before: State
  after: State
}

/** Describes an action in terms of the thoughts it changed, as a step the user can follow. */
type Describer = (action: UnknownAction, before: State) => string

/** Formats a thought value as inline code. */
const code = (value: string) => `\`${value}\``

/** Formats the value of the thought at the given path as inline code preceded by a space, or returns an empty string if there is no such thought so that a description reads naturally either way. */
const target = (state: State, path: Path | null | undefined): string => {
  const value = path ? headValue(state, path) : undefined
  return value !== undefined ? ` ${code(value)}` : ''
}

/** Describes where a new thought is inserted relative to the thought it is created from, e.g. " after `b`". */
const placement = (action: UnknownAction, before: State): string => {
  const at = (action.at as Path | undefined) ?? before.cursor
  const value = at ? headValue(before, at) : undefined
  return value === undefined
    ? ''
    : action.insertNewSubthought
      ? ` as a subthought of ${code(value)}`
      : action.insertBefore
        ? ` before ${code(value)}`
        : ` after ${code(value)}`
}

/** Describes the creation of a thought with the given value. */
const describeNewThought = (action: UnknownAction, before: State, value: string): string =>
  `Create ${value ? `thought ${code(value)}` : 'a new thought'}${placement(action, before)}.`

/** Hand-written descriptions of the core editing actions. Any other action falls back to its name and the cursor thought. */
const describers: Partial<Record<ActionType, Describer>> = {
  archiveThought: (action, before) => `Archive${target(before, (action.path as Path | undefined) ?? before.cursor)}.`,
  categorize: (_, before) => `Categorize${target(before, before.cursor)}.`,
  deleteThought: (action, before) => `Delete${target(before, [action.thoughtId as ThoughtId])}.`,
  deleteThoughtWithCursor: (_, before) => `Delete${target(before, before.cursor)}.`,
  editThought: action => `Edit ${code(action.oldValue as string)} to ${code(action.newValue as string)}.`,
  importText: (action, before) => {
    const text = action.text as string
    const path = action.path as Path | undefined
    const destination = path && !isRoot(path) ? target(before, path) : ''
    // A multiline paste is quoted in a code block indented under the step, so that the markdown list continues after it.
    return text.includes('\n')
      ? `Paste${destination ? ` into${destination}` : ''}:\n\n   \`\`\`\n${text
          .split('\n')
          .map(line => `   ${line}`)
          .join('\n')}\n   \`\`\``
      : `Paste ${code(text)}${destination ? ` into${destination}` : ''}.`
  },
  indent: (_, before) => `Indent${target(before, before.cursor)}.`,
  join: (_, before) => `Join${target(before, before.cursor)} with its siblings.`,
  moveThoughtDown: (_, before) => `Move${target(before, before.cursor)} down.`,
  moveThoughtUp: (_, before) => `Move${target(before, before.cursor)} up.`,
  newThought: (action, before) => describeNewThought(action, before, (action.value as string | undefined) ?? ''),
  outdent: (_, before) => `Outdent${target(before, before.cursor)}.`,
  splitThought: (action, before) => {
    const { left, right } = action.splitResult as { left: string; right: string }
    return `Split${target(before, (action.path as Path | undefined) ?? before.cursor)} into ${code(left)} and ${code(right)}.`
  },
  uncategorize: (action, before) => `Uncategorize${target(before, (action.at as Path | undefined) ?? before.cursor)}.`,
}

/** Describes a patch from the actions that produced it. Returns an empty string for a patch of navigation actions only, which is implied by the step it accompanies. */
const describePatch = ({ patch, before }: Snapshot): string => {
  const { rawActions } = patch[0]
  const [first] = rawActions

  // A multicursor command bundles every action it dispatched into one patch. Name the command and the thoughts that were selected.
  if (first?.type === 'setIsMulticursorExecuting') {
    const values = documentSort(before, Object.values(before.multicursors)).map(path => headValue(before, path) ?? '')
    return `${startCase(first.undoLabel as string)}${values.length ? ` ${values.map(code).join(', ')}` : ''}.`
  }

  const primary = rawActions.find(action => !isNavigation(action.type as ActionType))
  if (!primary) return ''

  // Contiguous edits are merged into one patch, so describe them as a single edit from the first old value to the last new value.
  const action =
    primary.type === 'editThought'
      ? { ...primary, newValue: findLast(rawActions, { type: 'editThought' })!.newValue }
      : primary
  const describe = describers[action.type as ActionType]
  return describe ? describe(action, before) : `${startCase(action.type)}${target(before, before.cursor)}.`
}

/** Describes a step from the snapshots of its patches in chronological order. */
const describeStep = (snapshots: Snapshot[]): string => {
  const [created, typed] = snapshots
  const edit = typed && findLast(typed.patch[0].rawActions, { type: 'editThought' })
  // A new thought followed by typing its value reads as a single creation, e.g. "Create thought `c` after `b`."
  return created.patch[0].rawActions[0]?.type === 'newThought' && edit
    ? describeNewThought(created.patch[0].rawActions[0], created.before, edit.newValue as string)
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
