import { RefObject } from 'react'
import ThoughtId from '../@types/ThoughtId'
import getThoughtById from '../selectors/getThoughtById'
import store from '../stores/app'
import debugFlags from './debugFlags'

/** Human-readable label for console logging (current thought value). */
export const thoughtDebugLabel = (thoughtId: string): string => {
  const value = getThoughtById(store.getState(), thoughtId as ThoughtId)?.value ?? ''
  return value === '' ? '(empty)' : `"${value}"`
}

/**
 * Logs viewport `getBoundingClientRect()` for the fade wrapper (inner nodeRef) at CSSTransition phases.
 * Enable with `em.debugFlags.thoughtLayoutVerbose = true`.
 */
export const logThoughtFadePhase = (
  phase: string,
  thoughtId: string,
  innerRef: RefObject<HTMLDivElement | null>,
): void => {
  if (!debugFlags.thoughtLayoutVerbose) return
  const el = innerRef.current
  const r = el?.getBoundingClientRect()
  console.info(
    `[thoughtLayout fade] ${thoughtDebugLabel(thoughtId)} phase=${phase} inner.top=${r ? r.top.toFixed(2) : 'n/a'} inner.h=${r ? r.height.toFixed(2) : 'n/a'}`,
  )
}
