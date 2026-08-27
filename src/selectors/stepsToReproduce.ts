import { applyPatch } from 'fast-json-patch'
import { produce } from 'immer'
import { findLast, isEqual, sortBy, startCase, uniq } from 'lodash'
import ActionType from '../@types/ActionType'
import Patch from '../@types/Patch'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { commandById, formatKeyboardShortcut, gestureString } from '../commands'
import { HOME_TOKEN } from '../constants'
import head from '../util/head'
import headValue from '../util/headValue'
import isAttribute from '../util/isAttribute'
import isRoot from '../util/isRoot'
import joinConjunction from '../util/joinConjunction'
import removeHome from '../util/removeHome'
import stripTags from '../util/stripTags'
import documentSort from './documentSort'
import exportContext from './exportContext'
import { getChildrenRanked } from './getChildren'
import undoHistory from './undoHistory'

/** A patch with the states before and after it. */
interface Snapshot {
  patch: Patch
  before: State
  after: State
}

/** Describes a patch in terms of the thoughts it changed, as a step the user can follow. The patch records only the types of the actions that produced it, so what they did is read off its operations and the states on either side of it. */
type Describer = (snapshot: Snapshot) => string

/** The formatting commands by the tags they wrap a value in. */
const FORMATTING: Record<string, string> = {
  b: 'Bold',
  code: 'Code',
  font: 'Color',
  del: 'Strikethrough',
  em: 'Italic',
  i: 'Italic',
  s: 'Strikethrough',
  strike: 'Strikethrough',
  strong: 'Bold',
  u: 'Underline',
}

/** Formats a string as inline code. */
const code = (s: string) => `\`${s}\``

/** Names a thought by its value as inline code, or as the empty thought. */
const name = (value: string) => (value ? code(value) : 'the empty thought')

/** Names the thought at the given path preceded by a space, or returns an empty string if there is no such thought so that a description reads naturally either way. */
const target = (state: State, path: Path | null): string => {
  const value = path ? headValue(state, path) : undefined
  return value !== undefined ? ` ${name(value)}` : ''
}

/** The ids of the thoughts whose entries a patch touches, from its operation paths. */
const touchedIds = (patch: Patch): ThoughtId[] =>
  uniq(patch.ops.flatMap(op => op.path.match(/^\/thoughts\/thoughtIndex\/([^/]+)/)?.[1] ?? [])) as ThoughtId[]

/** Returns the action or command id that produced a patch. */
const patchSourceId = (patch: Patch): string =>
  patch.metadata.source === 'command' ? patch.metadata.commandId : patch.metadata.actionType

/** Describes how a command was invoked. */
const describeCommandInvocation = (patch: Patch): string => {
  if (patch.metadata.source !== 'command') return ''
  const { commandId, keyboardIndex, type } = patch.metadata
  const command = commandById(commandId)

  switch (type) {
    case 'keyboard': {
      if (!command.keyboard) return `Run ${command.label}.`
      const shortcuts = Array.isArray(command.keyboard) ? command.keyboard : [command.keyboard]
      const shortcut = shortcuts[keyboardIndex ?? 0] ?? shortcuts[0]
      return `Press \`${formatKeyboardShortcut(shortcut)}\`.`
    }
    case 'gesture':
      return `Swipe \`${gestureString(command)}\`.`
    case 'toolbar':
      return `Tap the ${command.label} button.`
    case 'commandCenter':
      return `Tap ${command.label} in the Command Center.`
    case 'desktopCommandUniverse':
      return `Choose ${command.label} in the Command Universe.`
  }
}

/** The ids of the thoughts that exist after a patch but not before it, i.e. that its actions created. */
const createdIds = ({ patch, before, after }: Snapshot): ThoughtId[] =>
  touchedIds(patch).filter(id => !before.thoughts.thoughtIndex[id] && after.thoughts.thoughtIndex[id])

/** The ids of the thoughts that exist before a patch but not after it, i.e. that its actions deleted. */
const deletedIds = ({ patch, before, after }: Snapshot): ThoughtId[] =>
  touchedIds(patch).filter(id => before.thoughts.thoughtIndex[id] && !after.thoughts.thoughtIndex[id])

/** The topmost thoughts of a set in the given state, i.e. those whose parent is not in the set. */
const topmost = (state: State, ids: ThoughtId[]): ThoughtId[] =>
  ids.filter(id => !ids.includes(state.thoughts.thoughtIndex[id].parentId))

/** The ids of the selected thoughts in document order. */
const selectionIds = (state: State): ThoughtId[] =>
  documentSort(state, Object.values(state.multicursors)).map(path => head(path))

/** Names a thought in the given state by its value, or as the root. */
const describeThought = (state: State, id: ThoughtId): string =>
  isRoot([id]) ? 'the root' : name(state.thoughts.thoughtIndex[id]?.value ?? '')

/** The value of a thought followed by those of its only-child descendants, separated by slashes, e.g. =pin/true. Stops at an empty value. */
const chain = (state: State, id: ThoughtId): string => {
  const children = getChildrenRanked(state, id)
  const { value } = state.thoughts.thoughtIndex[id]
  return children.length === 1 && children[0].value ? `${value}/${chain(state, children[0].id)}` : value
}

/** The nearest meta attribute at or above a thought in the given state, i.e. the attribute whose value the thought is part of. */
const attributeRoot = (state: State, id: ThoughtId): ThoughtId | undefined => {
  const thought = state.thoughts.thoughtIndex[id]
  return !thought || isRoot([id]) ? undefined : isAttribute(thought.value) ? id : attributeRoot(state, thought.parentId)
}

/** The meta attributes a patch set, as the ids of their roots in the state after it: attributes it created, and attributes whose value it changed. */
const attributesSet = (snapshot: Snapshot): ThoughtId[] => {
  const { patch, before, after } = snapshot
  const created = topmost(after, createdIds(snapshot)).filter(id => isAttribute(after.thoughts.thoughtIndex[id].value))
  const edited = touchedIds(patch)
    .filter(id => before.thoughts.thoughtIndex[id] && after.thoughts.thoughtIndex[id])
    .filter(id => before.thoughts.thoughtIndex[id].value !== after.thoughts.thoughtIndex[id].value)
    .map(id => attributeRoot(after, id))
    .filter((id): id is ThoughtId => !!id)
  return uniq([...created, ...edited])
}

/** The meta attributes a patch removed, as the ids of their roots in the state before it. */
const attributesRemoved = (snapshot: Snapshot): ThoughtId[] =>
  topmost(snapshot.before, deletedIds(snapshot)).filter(id =>
    isAttribute(snapshot.before.thoughts.thoughtIndex[id].value),
  )

/** The id of the thought a patch moved to another parent or rank, if any. */
const movedId = ({ patch, before, after }: Snapshot): ThoughtId | undefined =>
  touchedIds(patch).find(id => {
    const oldThought = before.thoughts.thoughtIndex[id]
    const newThought = after.thoughts.thoughtIndex[id]
    return (
      oldThought && newThought && (oldThought.parentId !== newThought.parentId || oldThought.rank !== newThought.rank)
    )
  })

/** Describes the meta attributes that a patch set and removed, e.g. "sets `=pin/true`". Returns an empty string if it changed none. */
const attributeChanges = (snapshot: Snapshot): string => {
  const { before, after } = snapshot
  const set = attributesSet(snapshot)
  const removed = attributesRemoved(snapshot)
  return [
    set.length ? `sets ${joinConjunction(set.map(id => code(chain(after, id))))}` : '',
    removed.length ? `removes ${joinConjunction(removed.map(id => code(chain(before, id))))}` : '',
  ]
    .filter(Boolean)
    .join(' and ')
}

/** Returns true if the given thought is the cursor thought in the given state. */
const isCursor = (state: State, id: ThoughtId): boolean => !!state.cursor && head(state.cursor) === id

/** The siblings of a thought without the meta attributes, which are hidden and so cannot serve as a landmark. */
const visibleSiblings = (state: State, id: ThoughtId) =>
  getChildrenRanked(state, state.thoughts.thoughtIndex[id].parentId).filter(
    sibling => sibling.id === id || !isAttribute(sibling.value),
  )

/** Describes where a thought sits in the given state relative to its siblings, or its parent when it has none, e.g. " after `b`". */
const placement = (state: State, id: ThoughtId): string => {
  const { parentId } = state.thoughts.thoughtIndex[id]
  const siblings = visibleSiblings(state, id)
  const i = siblings.findIndex(sibling => sibling.id === id)
  const previous = siblings[i - 1]
  const next = siblings[i + 1]
  return previous
    ? ` after ${name(previous.value)}`
    : next
      ? ` before ${name(next.value)}`
      : isRoot([parentId])
        ? ''
        : ` as a subthought of ${describeThought(state, parentId)}`
}

/** Describes the creation of a thought by the command that creates it, e.g. "New Subthought `e`.". The value is read from the given state so that a value typed by a later patch of the same step can be used. */
const describeNewThought = (snapshot: Snapshot, state: State): string => {
  const { before, after } = snapshot
  const type = patchSourceId(snapshot.patch) ?? 'newThought'
  const [id] = topmost(after, createdIds(snapshot))
  if (!id) return `${startCase(type)}.`

  const value = state.thoughts.thoughtIndex[id]?.value
  const { parentId } = after.thoughts.thoughtIndex[id]
  const siblings = visibleSiblings(after, id)
  const i = siblings.findIndex(sibling => sibling.id === id)
  const previous = siblings[i - 1]
  const next = siblings[i + 1]
  const isSubthought = isCursor(before, parentId)

  // New Subthought dispatches newThought with insertNewSubthought, so only the thought's parent tells the two commands apart.
  const command = isSubthought && type === 'newThought' ? 'New Subthought' : startCase(type)
  // The cursor gives the position of a thought created at the bottom of it or right after it, which is what New Subthought
  // and New Thought do. Anything else is spelled out, including a subthought inserted above the existing subthoughts.
  const isDefaultPosition = isSubthought ? !next : !!previous && isCursor(before, previous.id)
  // A thought inserted above the cursor is placed by the cursor rather than by the sibling above it, which is what New
  // Thought Above does.
  const position = isDefaultPosition
    ? ''
    : next && isCursor(before, next.id)
      ? ` before ${name(next.value)}`
      : placement(after, id)
  return `${command}${value ? ` ${code(value)}` : ''}${position}.`
}

/** Describes an edit by the first thought whose value the patch changed. Contiguous edits are merged into one patch, so this reads as a single edit from the first old value to the last new value. A formatting command changes the tags but not the text, so it is named after the tag it added or removed, e.g. Bold. */
const describeEdit = ({ patch, before, after }: Snapshot): string => {
  const id = touchedIds(patch).find(id => {
    const oldValue = before.thoughts.thoughtIndex[id]?.value
    const newValue = after.thoughts.thoughtIndex[id]?.value
    return oldValue !== undefined && newValue !== undefined && oldValue !== newValue
  })
  if (!id) return 'Edit Thought.'

  const oldValue = before.thoughts.thoughtIndex[id].value
  const newValue = after.thoughts.thoughtIndex[id].value

  if (stripTags(oldValue) === stripTags(newValue)) {
    /** The names of the tags in an html value. */
    const tags = (html: string) => uniq([...html.matchAll(/<\/?([a-z0-9]+)/gi)].map(match => match[1].toLowerCase()))
    const oldTags = tags(oldValue)
    const newTags = tags(newValue)
    const formats = uniq(
      [...newTags.filter(tag => !oldTags.includes(tag)), ...oldTags.filter(tag => !newTags.includes(tag))]
        .map(tag => FORMATTING[tag])
        .filter(Boolean),
    )
    if (formats.length) return `${joinConjunction(formats)}.`
  }

  return `Edit ${name(oldValue)} to ${name(newValue)}.`
}

/** Describes an action that sets or removes a single meta attribute by the attribute's path, naming the thought it hangs off only when that is not the cursor, e.g. "Toggle Attribute `=pin`.". */
const describeAttribute =
  (verb: string): Describer =>
  snapshot => {
    const { before, after } = snapshot
    const [setId] = attributesSet(snapshot)
    const [removedId] = attributesRemoved(snapshot)
    const [state, id] = setId ? [after, setId] : [before, removedId]
    if (!id) return `${verb}.`
    const { parentId } = state.thoughts.thoughtIndex[id]
    return `${verb} ${code(chain(state, id))}${isCursor(before, parentId) ? '' : ` on ${describeThought(state, parentId)}`}.`
  }

/** Describes an extraction by the extracted text, which becomes the value of the created thought. */
const describeExtract =
  (verb: string): Describer =>
  snapshot => {
    const [created] = topmost(snapshot.after, createdIds(snapshot))
    return `${verb}${created ? ` ${name(snapshot.after.thoughts.thoughtIndex[created].value)}` : ''}.`
  }

/** Descriptions of the actions whose arguments a reader needs in order to repeat them: a value, a pasted text, an attribute, a destination. Any other action is named as dispatched, since the cursor it acts on is given by the step before it. */
const describers: Partial<Record<ActionType, Describer>> = {
  // the =archive attribute it creates is not an argument
  archiveThought: () => 'Archive Thought.',
  deleteAttribute: describeAttribute('Delete Attribute'),
  deleteThought: snapshot => {
    const [id] = topmost(snapshot.before, deletedIds(snapshot))
    return `Delete Thought${id && !isCursor(snapshot.before, id) ? ` ${name(snapshot.before.thoughts.thoughtIndex[id].value)}` : ''}.`
  },
  editThought: describeEdit,
  extractCategory: describeExtract('Extract Category'),
  extractSubthought: describeExtract('Extract Subthought'),
  importText: snapshot => {
    const { before, after } = snapshot
    const roots = sortBy(topmost(after, createdIds(snapshot)), id => after.thoughts.thoughtIndex[id].rank)
    // A single-line paste only inserts text into the value of the thought it is pasted into.
    if (!roots.length) {
      const id = touchedIds(snapshot.patch).find(id => {
        const oldValue = before.thoughts.thoughtIndex[id]?.value
        const newValue = after.thoughts.thoughtIndex[id]?.value
        return oldValue !== undefined && newValue !== undefined && oldValue !== newValue && newValue.includes(oldValue)
      })
      return id
        ? `Paste ${name(after.thoughts.thoughtIndex[id].value.replace(before.thoughts.thoughtIndex[id].value, ''))}${isCursor(before, id) ? '' : ` into ${name(before.thoughts.thoughtIndex[id].value)}`}.`
        : describeEdit(snapshot)
    }
    const { parentId } = after.thoughts.thoughtIndex[roots[0]]
    const destination =
      isRoot([parentId]) || isCursor(before, parentId) ? '' : ` into ${describeThought(after, parentId)}`
    // The pasted thoughts are quoted in a code block indented under the step, so that the markdown list continues after it.
    return `Paste${destination}:\n\n   \`\`\`\n${roots
      .map(id => exportContext(after, id, 'text/plain'))
      .join('\n')
      .split('\n')
      .map(line => `   ${line}`)
      .join('\n')}\n   \`\`\``
  },
  moveThought: snapshot => {
    const id = movedId(snapshot)
    return id
      ? `Move Thought${isCursor(snapshot.before, id) ? '' : ` ${name(snapshot.after.thoughts.thoughtIndex[id].value)}`}${placement(snapshot.after, id)}.`
      : 'Move Thought.'
  },
  newThought: snapshot => describeNewThought(snapshot, snapshot.after),
  setDescendant: describeAttribute('Set Descendant'),
  splitThought: snapshot => {
    const { before, after } = snapshot
    const left = before.cursor ? after.thoughts.thoughtIndex[head(before.cursor)]?.value : undefined
    const [created] = createdIds(snapshot)
    const right = created && after.thoughts.thoughtIndex[created]?.value
    return `Split Thought${left !== undefined && right !== undefined ? ` into ${name(left)} and ${name(right)}` : ''}.`
  },
  toggleAttribute: describeAttribute('Toggle Attribute'),
}

/** Describes the object/effect of a command from the patch operations and surrounding states. */
const describeCommandEffect = (snapshot: Snapshot): string => {
  const source = snapshot.patch.metadata
  if (source.source !== 'command') return ''
  const describe = describers[source.commandId as ActionType]
  if (describe) return describe(snapshot)

  const changes = attributeChanges(snapshot)
  if (changes) return `This ${changes}.`

  if (createdIds(snapshot).length) return describeNewThought(snapshot, snapshot.after)
  if (deletedIds(snapshot).length) return describers.deleteThought!(snapshot)
  if (movedId(snapshot)) return describers.moveThought!(snapshot)

  const edited = touchedIds(snapshot.patch).some(id => {
    const before = snapshot.before.thoughts.thoughtIndex[id]?.value
    const after = snapshot.after.thoughts.thoughtIndex[id]?.value
    return before !== undefined && after !== undefined && before !== after
  })
  return edited ? describeEdit(snapshot) : ''
}

/** Describes a patch from the types of the actions that produced it. Returns an empty string for a patch of navigation actions only, which is surfaced as a cursor move before the next step instead. */
const describePatch = (snapshot: Snapshot): string => {
  const { metadata } = snapshot.patch
  if (metadata.isNavigation) return ''
  const type = patchSourceId(snapshot.patch)

  if (metadata.source === 'command') {
    const invocation = describeCommandInvocation(snapshot.patch)
    const detail = describeCommandEffect(snapshot)
    return detail && detail !== `${metadata.label}.` ? `${invocation} ${detail}` : invocation
  }

  const describe = describers[type as ActionType]
  if (describe) return describe(snapshot)
  // an action dispatched without arguments is named as is, plus any meta attributes it set or removed, which tell toggles apart
  const changes = attributeChanges(snapshot)
  return `${startCase(type)}${changes ? ` (${changes})` : ''}.`
}

/** Describes a step from the snapshots of its patches in chronological order. */
const describeStep = (snapshots: Snapshot[]): string => {
  const [created, typed] = snapshots
  // A new thought followed by typing its value reads as a single creation, e.g. "New Thought `c`."
  return patchSourceId(created.patch) === 'newThought' && typed
    ? describeNewThought(created, typed.after)
    : snapshots.map(describePatch).filter(Boolean).join(' ')
}

/** Describes setting the cursor on the thought at the given path. */
const describeSetCursor = (state: State, path: Path) => `Set the cursor on${target(state, path)}.`

/** Describes selecting the given thoughts, e.g. "Select `a`, `b`, and `c`.". */
const describeSelect = (state: State, ids: ThoughtId[]) =>
  `Select ${joinConjunction(ids.map(id => name(state.thoughts.thoughtIndex[id]?.value ?? '')))}.`

/** Exports the thoughtspace of the given state as plain text with meta attributes, without the root. Returns an empty string if the thoughtspace is empty, which exports as the root's placeholder value rather than as nothing. */
const exportTree = (state: State): string =>
  getChildrenRanked(state, HOME_TOKEN).length
    ? // removeHome wraps the children of the root in newlines
      removeHome(exportContext(state, [HOME_TOKEN], 'text/plain')).replace(/^\n|\n$/g, '')
    : ''

/** Generates a bug report in markdown for the actions between two positions of the undo history: the steps to reproduce them, starting from the thoughtspace at the start position, followed by the thoughtspace at the end position as the current behavior and an empty heading for the expected behavior. Positions count steps back from the present, so start is at or before end. */
const stepsToReproduce = (state: State, positions: { start: number; end: number }): string => {
  const { patches, position } = undoHistory(state)

  // Clamp the positions to the history, which may have changed since they were chosen. The undo slider keeps its handles as
  // long as the number of patches is unchanged, but the same number of patches can group into fewer steps, leaving a handle
  // past the end of the history.
  const start = Math.min(Math.max(positions.start, 0), patches.length)
  const end = Math.min(Math.max(positions.end, 0), start)

  // Reconstruct the state before and after each patch between the current state and the two positions.
  // The undo stack holds inverse patches, applied newest first to walk back to the start.
  const undoSnapshots = patches.slice(position, start).reduce<Snapshot[]>((snapshots, patch) => {
    const after = snapshots.at(-1)?.before ?? state
    return [...snapshots, { patch, before: produce(after, draft => applyPatch(draft, patch.ops).newDocument), after }]
  }, [])
  // The redo stack holds forward patches, applied oldest first to walk forward to the end.
  const redoSnapshots = patches
    .slice(end, position)
    .reverse()
    .reduce<Snapshot[]>((snapshots, patch) => {
      const before = snapshots.at(-1)?.after ?? state
      return [
        ...snapshots,
        { patch, before, after: produce(before, draft => applyPatch(draft, patch.ops).newDocument) },
      ]
    }, [])
  const snapshots = new Map([...undoSnapshots, ...redoSnapshots].map(snapshot => [snapshot.patch, snapshot]))

  /** The state at a position: the current state, the state before the oldest patch of the step ahead of it, or the state after the newest patch of the step behind it. */
  const stateAt = (p: number): State =>
    p === position ? state : p > position ? snapshots.get(patches[p - 1])!.before : snapshots.get(patches[p])!.after

  // The steps in chronological order, each as the snapshots of its patches. A step of navigation actions only is folded into the cursor move that precedes the next step.
  const stepSnapshots = patches
    .slice(end, start)
    .reverse()
    .map(patch => [snapshots.get(patch)!])
    .filter(snapshots => snapshots.some(({ patch }) => !patch.metadata.isNavigation))

  // The steps act on the cursor and the selection, so a step whose cursor or selection differs from what the previous step left is preceded by the move or selection that gets there. Neither is known before the first step, so the steps always begin with the cursor, and with the selection if the first step is a multicursor command. The cursor a step leaves is read after its last non-navigation patch, so that a trailing cursor move surfaces before the next step.
  const { descriptions } = stepSnapshots.reduce<{
    descriptions: string[]
    cursor: ThoughtId | null
    selection: ThoughtId[]
  }>(
    ({ descriptions, cursor, selection }, snapshots) => {
      const { before } = snapshots[0]
      const cursorBefore = before.cursor ? head(before.cursor) : null
      const selectionBefore = selectionIds(before)
      const source = snapshots[0].patch.metadata
      const multicursor = source.source === 'command' && !!commandById(source.commandId).multicursor
      const primary = findLast(snapshots, ({ patch }) => !patch.metadata.isNavigation)!
      const description = describeStep(snapshots)
      return {
        descriptions: [
          ...descriptions,
          ...(before.cursor && cursorBefore !== cursor ? [describeSetCursor(before, before.cursor)] : []),
          ...(multicursor && selectionBefore.length && !isEqual(selectionBefore, selection)
            ? [describeSelect(before, selectionBefore)]
            : []),
          ...(description ? [description] : []),
        ],
        cursor: primary.after.cursor ? head(primary.after.cursor) : null,
        selection: multicursor ? selectionIds(primary.after) : selection,
      }
    },
    { descriptions: [], cursor: null, selection: [] },
  )

  const treeAtStart = exportTree(stateAt(start))
  const treeAtEnd = exportTree(stateAt(end))

  // Sections are separated by a single blank line. The report ends with two blank lines for the expected behavior to be written into.
  return [
    '## Steps to Reproduce',
    // an empty thoughtspace has no tree to show
    ...(treeAtStart ? [`\`\`\`\n${treeAtStart}\n\`\`\``] : []),
    ...(descriptions.length ? [descriptions.map((description, i) => `${i + 1}. ${description}`).join('\n')] : []),
    '## Current Behavior',
    ...(treeAtEnd ? [`\`\`\`\n${treeAtEnd}\n\`\`\``] : []),
    '## Expected Behavior\n\n\n',
  ].join('\n\n')
}

export default stepsToReproduce
