/**
 * Copyright (c) Nicolas Gallagher.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Faithful TypeScript port of react-native-web's useResponderEvents/utils.js.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-use-before-define, import/prefer-default-export */

const keyName = '__reactResponderId'

/** Checks if the current text selection is valid (non-empty text selection). */
function isSelectionValid(): boolean {
  // eslint-disable-next-line no-restricted-properties
  const selection = window.getSelection()
  if (!selection) return false
  const string = selection.toString()
  const anchorNode = selection.anchorNode
  const focusNode = selection.focusNode
  const isTextNode =
    (anchorNode != null && anchorNode.nodeType === window.Node.TEXT_NODE) ||
    (focusNode != null && focusNode.nodeType === window.Node.TEXT_NODE)
  return string.length >= 1 && string !== '\n' && !!isTextNode
}

/** Gets the event path from a DOM event, using composedPath or a fallback. */
function getEventPath(domEvent: any): any[] {
  // The 'selectionchange' event always has the 'document' as the target.
  // Use the anchor node as the initial target to reconstruct a path.
  // (We actually only need the first "responder" node in practice.)
  if (domEvent.type === 'selectionchange') {
    // eslint-disable-next-line no-restricted-properties
    const target = window.getSelection()?.anchorNode
    return composedPathFallback(target)
  } else {
    const path = domEvent.composedPath != null ? domEvent.composedPath() : composedPathFallback(domEvent.target)
    return path
  }
}

/** Walks up the DOM tree from target to document.body to build an event path. */
function composedPathFallback(target: any): any[] {
  const path: any[] = []
  while (target != null && target !== document.body) {
    path.push(target)
    target = target.parentNode
  }
  return path
}

/** Retrieves the responderId from a host node. */
function getResponderId(node: any): number | null {
  if (node != null) {
    return node[keyName] ?? null
  }
  return null
}

/** Stores the responderId on a host node. */
export function setResponderId(node: any, id: number): void {
  if (node != null) {
    node[keyName] = id
  }
}

/** Filters the event path to contain only the nodes attached to the responder system. */
export function getResponderPaths(domEvent: any): { idPath: number[]; nodePath: any[] } {
  const idPath: number[] = []
  const nodePath: any[] = []
  const eventPath = getEventPath(domEvent)
  for (let i = 0; i < eventPath.length; i++) {
    const node = eventPath[i]
    const id = getResponderId(node)
    if (id != null) {
      idPath.push(id)
      nodePath.push(node)
    }
  }
  return { idPath, nodePath }
}

/** Walks the paths and finds the first common ancestor. */
export function getLowestCommonAncestor(pathA: any[], pathB: any[]): any {
  let pathALength = pathA.length
  let pathBLength = pathB.length
  if (
    // If either path is empty
    pathALength === 0 ||
    pathBLength === 0 ||
    // If the last elements aren't the same there can't be a common ancestor
    // that is connected to the responder system
    pathA[pathALength - 1] !== pathB[pathBLength - 1]
  ) {
    return null
  }

  let itemA = pathA[0]
  let indexA = 0
  let itemB = pathB[0]
  let indexB = 0

  // If A is deeper, skip indices that can't match.
  if (pathALength - pathBLength > 0) {
    indexA = pathALength - pathBLength
    itemA = pathA[indexA]
    pathALength = pathBLength
  }

  // If B is deeper, skip indices that can't match
  if (pathBLength - pathALength > 0) {
    indexB = pathBLength - pathALength
    itemB = pathB[indexB]
    pathBLength = pathALength
  }

  // Walk in lockstep until a match is found
  let depth = pathALength
  while (depth--) {
    if (itemA === itemB) {
      return itemA
    }
    itemA = pathA[indexA++]
    itemB = pathB[indexB++]
  }
  return null
}

/**
 * Determines whether any of the active touches are within the current responder.
 * This cannot rely on W3C `targetTouches`, as neither IE11 nor Safari implement it.
 */
export function hasTargetTouches(target: any, touches: any): boolean {
  if (!touches || touches.length === 0) {
    return false
  }
  for (let i = 0; i < touches.length; i++) {
    const node = touches[i].target
    if (node != null) {
      if (target.contains(node)) {
        return true
      }
    }
  }
  return false
}

/**
 * Ignores 'selectionchange' events that don't correspond with a person's intent to
 * select text.
 */
export function hasValidSelection(domEvent: any): boolean {
  if (domEvent.type === 'selectionchange') {
    return isSelectionValid()
  }
  return domEvent.type === 'select'
}

/** Checks if events are valid based on the primary button being used without specific modifier keys. */
export function isPrimaryPointerDown(domEvent: any): boolean {
  const { altKey, button, buttons, ctrlKey, type } = domEvent
  const isTouch = type === 'touchstart' || type === 'touchmove'
  const isPrimaryMouseDown = type === 'mousedown' && (button === 0 || buttons === 1)
  const isPrimaryMouseMove = type === 'mousemove' && buttons === 1
  const noModifiers = altKey === false && ctrlKey === false

  if (isTouch || (isPrimaryMouseDown && noModifiers) || (isPrimaryMouseMove && noModifiers)) {
    return true
  }
  return false
}
