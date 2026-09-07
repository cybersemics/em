import { escape as escapeHtml, unescape as unescapeHtml } from 'html-escaper'
import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import { HOME_PATH } from '../constants'
import canOrganizeThought from '../selectors/canOrganizeThought'
import { getChildrenRanked } from '../selectors/getChildren'
import getNextRank from '../selectors/getNextRank'
import getPrevRank from '../selectors/getPrevRank'
import getRankAfter from '../selectors/getRankAfter'
import getThoughtById from '../selectors/getThoughtById'
import isPending from '../selectors/isPending'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import someDescendants from '../selectors/someDescendants'
import thoughtToPath from '../selectors/thoughtToPath'
import appendToPath from '../util/appendToPath'
import createId from '../util/createId'
import equalPath from '../util/equalPath'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isRoot from '../util/isRoot'
import keyValueBy from '../util/keyValueBy'
import strip from '../util/strip'
import { addMulticursorActionCreator as addMulticursor } from './addMulticursor'
import { alertActionCreator as alert } from './alert'
import { clearMulticursorsActionCreator as clearMulticursors } from './clearMulticursors'
import { createThoughtActionCreator as createThought } from './createThought'
import { editThoughtActionCreator as editThought } from './editThought'
import { errorActionCreator as error } from './error'
import { moveThoughtActionCreator as moveThought } from './moveThought'
import { pullActionCreator as pull } from './pull'
import { setCursorActionCreator as setCursor } from './setCursor'
import { updateThoughtsActionCreator as updateThoughts } from './updateThoughts'

/** A node in the reorganized outline returned by the AI service. */
interface OutlineNode {
  id: string | null
  text: string | null
  children: OutlineNode[]
}

/** An outline node resolved to a thought id, including newly created thoughts. */
interface ResolvedNode {
  thoughtId: ThoughtId
  text: string | null
  isNew: boolean
  children: ResolvedNode[]
}

/** Captured identity of one reorganizable thought for stale-state checks. */
interface ReorganizableThought {
  originalValue: string
  thoughtId: ThoughtId
}

/** Active Organize Thought request for each thought. */
const pendingOrganizations = new Map<ThoughtId, symbol>()

/** Returns the visible, decoded text represented by a thought value. */
const normalizeValue = (value: string): string => unescapeHtml(strip(value))

/** Returns ranked children that are not meta attributes. */
const visibleChildren = (state: State, id: ThoughtId): Thought[] =>
  getChildrenRanked(state, id).filter(child => !isAttribute(child.value))

/** Builds the numbered outline and the mapping from prompt ids to thought ids. */
const buildOutline = (
  state: State,
  {
    parentId,
    selectedIds,
  }: {
    parentId: ThoughtId
    selectedIds: Set<ThoughtId>
  },
): { idMap: Map<string, ThoughtId>; outline: string } => {
  /** Renders a sibling list, numbering reorganizable thoughts and omitting children of context-only siblings. */
  const renderThoughts = (
    thoughts: Thought[],
    indent: number,
    reorganizable: boolean,
    startId: number,
  ): { idMap: Map<string, ThoughtId>; lines: string[]; nextId: number } =>
    thoughts.reduce(
      (accum, thought) => {
        const indentText = '  '.repeat(indent)
        const visible = normalizeValue(thought.value)
        if (!reorganizable) {
          return {
            ...accum,
            lines: [...accum.lines, `${indentText}[]${visible ? ` ${visible}` : ''}`],
          }
        }

        const id = String(accum.nextId)
        const nested = renderThoughts(visibleChildren(state, thought.id), indent + 1, true, accum.nextId + 1)
        return {
          idMap: new Map([...accum.idMap, [id, thought.id], ...nested.idMap]),
          lines: [...accum.lines, `${indentText}[${id}]${visible ? ` ${visible}` : ''}`, ...nested.lines],
          nextId: nested.nextId,
        }
      },
      { idMap: new Map<string, ThoughtId>(), lines: [] as string[], nextId: startId },
    )

  const parent = getThoughtById(state, parentId)
  const includeParent = !!parent && !isRoot([parentId])
  const numbered = visibleChildren(state, parentId).reduce(
    (accum, thought) => {
      const nested = renderThoughts([thought], includeParent ? 1 : 0, selectedIds.has(thought.id), accum.nextId)
      return {
        idMap: new Map([...accum.idMap, ...nested.idMap]),
        lines: [...accum.lines, ...nested.lines],
        nextId: nested.nextId,
      }
    },
    { idMap: new Map<string, ThoughtId>(), lines: [] as string[], nextId: 1 },
  )

  const parentVisible = parent ? normalizeValue(parent.value) : ''
  return {
    idMap: numbered.idMap,
    outline: includeParent
      ? [`[]${parentVisible ? ` ${parentVisible}` : ''}`, ...numbered.lines].join('\n')
      : numbered.lines.join('\n'),
  }
}

/** Collects every existing-thought id from an outline tree. */
const collectOutlineIds = (nodes: OutlineNode[]): string[] =>
  nodes.flatMap(node => [...(node.id ? [node.id] : []), ...collectOutlineIds(node.children)])

/** Parses a single outline node from an untrusted AI response. */
const parseOutlineNode = (value: unknown): OutlineNode | null => {
  if (!value || typeof value !== 'object') return null
  const idValue = 'id' in value ? value.id : null
  const textValue = 'text' in value ? value.text : null
  const childrenValue = 'children' in value ? value.children : []
  const id =
    idValue == null || idValue === ''
      ? null
      : typeof idValue === 'string' || typeof idValue === 'number'
        ? String(idValue)
        : undefined
  const text = textValue == null ? null : typeof textValue === 'string' ? textValue : undefined
  if (id === undefined || text === undefined || !Array.isArray(childrenValue)) return null
  const children = childrenValue.map(parseOutlineNode)
  return children.some(child => child === null) ? null : { id, text, children: children as OutlineNode[] }
}

/** Returns true when the outline is a complete, exact permutation of the expected ids. */
const isValidOutline = (nodes: OutlineNode[], expectedIds: Set<string>): boolean => {
  const outputIds = collectOutlineIds(nodes)
  return (
    nodes.length > 0 &&
    nodes.every(function isComplete(node): boolean {
      return (!!node.id || !!node.text?.trim()) && node.children.every(isComplete)
    }) &&
    outputIds.length === expectedIds.size &&
    outputIds.every(id => expectedIds.has(id)) &&
    expectedIds.size === new Set(outputIds).size
  )
}

/**
 * Restores the multicursor selection to the current paths of the given thoughts after they have been moved.
 * The command loop restores the selection before an async command returns, so those paths still point at the old
 * parents. Recomputing them keeps the bullet indicators, desktop alert, and Command Center in sync.
 */
const restoreMulticursors =
  (thoughtIds: ThoughtId[]): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    if (Object.keys(state.multicursors).length === 0) return

    const restoredPaths = thoughtIds.flatMap(thoughtId => {
      if (!getThoughtById(state, thoughtId)) return []
      const recomputed = thoughtToPath(state, thoughtId)
      return equalPath(recomputed, HOME_PATH) ? [] : [recomputed]
    })
    if (restoredPaths.length === 0) return

    const cursorId = state.cursor && head(state.cursor)
    const cursorPath = cursorId && getThoughtById(state, cursorId) ? thoughtToPath(state, cursorId) : null
    const restoredCursorPath =
      (cursorPath && !equalPath(cursorPath, HOME_PATH) ? cursorPath : restoredPaths.at(-1)) ?? null

    dispatch([
      clearMulticursors(),
      ...restoredPaths.map(path => addMulticursor({ path })),
      setCursor({ path: restoredCursorPath, preserveMulticursor: true }),
    ])
  }

/** Sets or clears Thought.generating on the given thoughts without creating undo history. */
const setGenerating =
  (thoughtIds: ThoughtId[], generating: boolean): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const thoughtIndexUpdates = keyValueBy(thoughtIds, (thoughtId: ThoughtId) => {
      const thought = getThoughtById(state, thoughtId)
      return thought && thought.generating !== generating ? { [thoughtId]: { ...thought, generating } } : null
    })
    if (Object.keys(thoughtIndexUpdates).length === 0) return
    dispatch(
      updateThoughts({
        thoughtIndexUpdates,
        lexemeIndexUpdates: {},
        local: false,
        overwritePending: true,
        remote: false,
      }),
    )
  }

/** Moves a thought under destParentId, placing it after afterId or at the start of the visible children. */
const moveToParent =
  ({
    afterId,
    destParentId,
    thoughtId,
  }: {
    afterId: ThoughtId | null
    destParentId: ThoughtId
    thoughtId: ThoughtId
  }): Thunk =>
  (dispatch, getState) => {
    if (thoughtId === destParentId) return
    const state = getState()
    const thought = getThoughtById(state, thoughtId)
    const destParent = getThoughtById(state, destParentId)
    if (!thought || !destParent) return
    dispatch(
      moveThought({
        newPath: appendToPath(thoughtToPath(state, destParentId), thoughtId),
        newRank: afterId ? getRankAfter(state, thoughtToPath(state, afterId)) : getPrevRank(state, destParentId),
        oldPath: thoughtToPath(state, thoughtId),
      }),
    )
  }

/** Creates new thoughts, parks descendants under the shared parent to break cycles, then moves everything into the resolved tree. */
const applyOutline =
  ({
    lastBeforeId,
    parentId,
    resolved,
  }: {
    lastBeforeId: ThoughtId | null
    parentId: ThoughtId
    resolved: ResolvedNode[]
  }): Thunk =>
  (dispatch, getState) => {
    const parentPath = thoughtToPath(getState(), parentId)
    const newThoughts = (function collectNew(nodes: ResolvedNode[]): { text: string; thoughtId: ThoughtId }[] {
      return nodes.flatMap(node => [
        ...(node.isNew && node.text?.trim() ? [{ text: node.text.trim(), thoughtId: node.thoughtId }] : []),
        ...collectNew(node.children),
      ])
    })(resolved)

    newThoughts.forEach(({ text, thoughtId }) => {
      dispatch(
        createThought({
          id: thoughtId,
          path: parentPath,
          rank: getNextRank(getState(), parentId),
          value: escapeHtml(text),
        }),
      )
    })

    // Move descendants to the shared parent first, deepest first, so a later move cannot drag a child that belongs
    // elsewhere. Selected thoughts are already children of the parent and are left in place.
    const stateAfterCreate = getState()
    const existingIds = (function collectExisting(nodes: ResolvedNode[]): ThoughtId[] {
      return nodes.flatMap(node => [...(node.isNew ? [] : [node.thoughtId]), ...collectExisting(node.children)])
    })(resolved)
    const parkIds = existingIds
      .filter(thoughtId => getThoughtById(stateAfterCreate, thoughtId)?.parentId !== parentId)
      .sort((a, b) => thoughtToPath(stateAfterCreate, b).length - thoughtToPath(stateAfterCreate, a).length)

    parkIds.forEach(thoughtId => {
      const state = getState()
      const thought = getThoughtById(state, thoughtId)
      if (!thought || thought.parentId === parentId) return
      dispatch(
        moveThought({
          newPath: appendToPath(thoughtToPath(state, parentId), thoughtId),
          newRank: getNextRank(state, parentId),
          oldPath: thoughtToPath(state, thoughtId),
        }),
      )
    })

    /** Places nodes in order under destParentId. */
    const placeNodes = (nodes: ResolvedNode[], destParentId: ThoughtId, afterId: ThoughtId | null) => {
      nodes.reduce<ThoughtId | null>((previousId, node) => {
        dispatch(moveToParent({ afterId: previousId, destParentId, thoughtId: node.thoughtId }))
        placeNodes(node.children, node.thoughtId, null)
        return node.thoughtId
      }, afterId)
    }

    placeNodes(resolved, parentId, lastBeforeId)

    resolved
      .flatMap(function collectEdits(node: ResolvedNode): { text: string; thoughtId: ThoughtId }[] {
        return [
          ...(node.text?.trim() && !node.isNew ? [{ text: node.text.trim(), thoughtId: node.thoughtId }] : []),
          ...node.children.flatMap(collectEdits),
        ]
      })
      .forEach(({ text, thoughtId }) => {
        const state = getState()
        const thought = getThoughtById(state, thoughtId)
        const path = thoughtToPath(state, thoughtId)
        if (!thought || normalizeValue(thought.value) === text) return
        dispatch(
          editThought({
            force: true,
            newValue: escapeHtml(text),
            oldValue: thought.value,
            path,
            preventMerge: true,
          }),
        )
      })
  }

/**
 * Pulls descendants of the selected sibling thoughts, asks the AI service to reorganize them, and applies the
 * returned tree by moving existing thoughts and creating new ones for categories and split pieces.
 */
const organizeThought =
  (paths: Path[]): Thunk<Promise<void>> =>
  async (dispatch, getState) => {
    const state = getState()
    if (!canOrganizeThought(state, paths)) return

    const simplePaths = paths.map(path => simplifyPath(state, path))
    const parentId = head(rootedParentOf(state, simplePaths[0]))
    const selectedIds = new Set(simplePaths.map(path => head(path)))
    const thoughtIds = [...selectedIds]
    const needsPull = thoughtIds.some(id =>
      someDescendants(state, id, child => isPending(state, getThoughtById(state, child.id))),
    )

    if (needsPull) {
      dispatch(alert('Loading thoughts...', { clearDelay: null }))
      await dispatch(pull(thoughtIds, { maxDepth: Infinity }))
      dispatch(alert(null))
    }

    const stateAfterPull = getState()
    if (!canOrganizeThought(stateAfterPull, paths)) return

    const { idMap, outline } = buildOutline(stateAfterPull, { parentId, selectedIds })
    const reorganizableThoughts: ReorganizableThought[] = [...idMap.values()].flatMap(thoughtId => {
      const thought = getThoughtById(stateAfterPull, thoughtId)
      return thought ? [{ originalValue: thought.value, thoughtId }] : []
    })
    if (reorganizableThoughts.length !== idMap.size) return

    const siblings = visibleChildren(stateAfterPull, parentId)
    const firstSelectedIndex = siblings.findIndex(sibling => selectedIds.has(sibling.id))
    const lastBeforeId =
      firstSelectedIndex > 0
        ? (siblings
            .slice(0, firstSelectedIndex)
            .filter(sibling => !selectedIds.has(sibling.id))
            .at(-1)?.id ?? null)
        : null

    const requestId = Symbol()
    reorganizableThoughts.forEach(thought => pendingOrganizations.set(thought.thoughtId, requestId))
    dispatch(
      setGenerating(
        reorganizableThoughts.map(thought => thought.thoughtId),
        true,
      ),
    )

    try {
      if (!import.meta.env.VITE_AI_URL) {
        throw new Error('import.meta.env.VITE_AI_URL is not configured')
      }

      const response = await fetch(`${import.meta.env.VITE_AI_URL}/organizeThought`, {
        body: JSON.stringify({ outline }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const result: unknown = await response.json()
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid AI response')
      }

      const errorMessage = 'error' in result ? result.error : undefined
      if (typeof errorMessage === 'string') {
        if (response.status === 429) {
          dispatch(alert('Rate limit reached. Please try again later.'))
        } else {
          dispatch(error({ value: errorMessage }))
        }
        return
      }

      const rawOutline = 'outline' in result ? result.outline : undefined
      const nodes = Array.isArray(rawOutline) ? rawOutline.map(parseOutlineNode) : null
      if (
        !nodes ||
        nodes.some(node => node === null) ||
        !isValidOutline(nodes as OutlineNode[], new Set(idMap.keys()))
      ) {
        throw new Error('Invalid AI response')
      }

      const currentState = getState()
      const isStale = reorganizableThoughts.some(({ originalValue, thoughtId }) => {
        const thought = getThoughtById(currentState, thoughtId)
        return (
          !thought ||
          thought.value !== originalValue ||
          !thought.generating ||
          pendingOrganizations.get(thoughtId) !== requestId
        )
      })
      if (isStale) return

      /** Resolves prompt ids to thought ids and assigns new ids to created thoughts. */
      const resolveNodes = (outlineNodes: OutlineNode[]): ResolvedNode[] =>
        outlineNodes.map(node => ({
          children: resolveNodes(node.children),
          isNew: node.id === null,
          text: node.text,
          thoughtId: node.id ? idMap.get(node.id)! : createId(),
        }))

      dispatch(
        applyOutline({
          lastBeforeId,
          parentId,
          resolved: resolveNodes(nodes as OutlineNode[]),
        }),
      )
      dispatch(restoreMulticursors(thoughtIds))
    } catch {
      dispatch(error({ value: 'Failed to organize thoughts' }))
    } finally {
      const currentState = getState()
      const thoughtIdsToClear = reorganizableThoughts
        .filter(({ thoughtId }) => pendingOrganizations.get(thoughtId) === requestId)
        .map(({ thoughtId }) => thoughtId)
      thoughtIdsToClear.forEach(thoughtId => pendingOrganizations.delete(thoughtId))
      dispatch(
        setGenerating(
          thoughtIdsToClear.filter(thoughtId => getThoughtById(currentState, thoughtId)?.generating),
          false,
        ),
      )
    }
  }

export default organizeThought
