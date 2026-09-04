import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import isAttribute from '../util/isAttribute'
import attribute from './attribute'
import findDescendant from './findDescendant'
import { getChildrenRanked } from './getChildren'
import getThoughtById from './getThoughtById'

const MINUTES_PER_DAY = 24 * 60

/** The step used when `=bullet/Time` has no step child. */
const DEFAULT_TIME_STEP = 15

/** The clock time of a thought in a `=bullet/Time` list. */
interface BulletTime {
  /** Minutes since midnight, wrapped past midnight. */
  minutes: number
  /** The list's step in minutes. */
  step: number
  /** Whether the list's `=stepStart` literals use a 12-hour clock, or null to follow the locale when none does. */
  hour12: boolean | null
  /** The thought's own `=stepStart` literal, if it has one. */
  stepStart: string | null
}

/** Parses a step literal such as 5min, 15min, 30min, or 1h into minutes. Returns null if the literal is not recognized. */
const parseStep = (value: string): number | null => {
  const match = value.trim().match(/^(\d+)\s*(min|m|h|hr)$/i)
  if (!match) return null
  const n = parseInt(match[1], 10)
  return n > 0 ? (match[2].toLowerCase().startsWith('h') ? n * 60 : n) : null
}

/** Parses a `=stepStart` literal such as 1:30, 13:30, 09:00, 1:30 pm, or 1pm into minutes since midnight. Returns null if the literal is not recognized. */
const parseTime = (value: string): number | null => {
  const match =
    value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m?\.?$/i) || value.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = parseInt(match[1], 10)
  const minutes = match[2] ? parseInt(match[2], 10) : 0
  const period = match[3]?.toLowerCase()
  if (hours > 23 || minutes > 59 || (period && (hours < 1 || hours > 12))) return null
  const hours24 = period === 'p' ? (hours % 12) + 12 : period === 'a' ? hours % 12 : hours
  return hours24 * 60 + minutes
}

/** Infers the clock of a `=stepStart` literal: am/pm means 12-hour, an hour above 12 or a leading zero means 24-hour, and anything else is ambiguous (null). */
const literalHour12 = (value: string): boolean | null =>
  /[ap]\.?m?\.?$/i.test(value.trim()) ? true : /^(0\d|1[3-9]|2\d)/.test(value.trim()) ? false : null

/**
 * Derives the clock time of a thought whose list has `=bullet/Time` (via `=children/=bullet/Time` on the parent or
 * `=grandchildren/=bullet/Time` on the grandparent). Returns null if the thought is not in a Time list.
 *
 * Derivation is forward-only through the visible, non-attribute siblings in rank order: the first thought renders its
 * `=stepStart` if present, otherwise the `created` timestamp of the `Time` attribute (when the style was applied)
 * rounded up to the step; each later thought renders the previous time plus the step unless it has its own
 * `=stepStart`, which re-bases the thoughts below it. The step is the first child of `Time` (5min, 15min, 30min, 1h),
 * defaulting to 15min. Out-of-order or unparseable `=stepStart` values are not validated; an unparseable one is ignored.
 */
const getBulletTime = (state: State, id: ThoughtId): BulletTime | null => {
  const thought = getThoughtById(state, id)
  if (!thought || isAttribute(thought.value)) return null

  const parentId = thought.parentId
  const grandparentId = getThoughtById(state, parentId)?.parentId ?? null
  const timeId =
    findDescendant(state, parentId, ['=children', '=bullet', 'Time']) ??
    findDescendant(state, grandparentId, ['=grandchildren', '=bullet', 'Time'])
  const timeThought = timeId ? getThoughtById(state, timeId) : null
  if (!timeThought) return null

  const stepLiteral = getChildrenRanked(state, timeThought.id).find(child => !isAttribute(child.value))?.value
  const step = (stepLiteral && parseStep(stepLiteral)) || DEFAULT_TIME_STEP

  const siblings = getChildrenRanked(state, parentId).filter(sibling => !isAttribute(sibling.value))
  const index = siblings.findIndex(sibling => sibling.id === id)
  if (index === -1) return null

  const stepStarts = siblings.map(sibling => attribute(state, sibling.id, '=stepStart'))

  // The list starts when the style was applied, rounded up to the step: a list styled at 9:47 with a 15min step starts at 10:00.
  const created = new Date(timeThought.created)
  const start = Math.ceil((created.getHours() * 60 + created.getMinutes()) / step) * step

  const minutes = stepStarts.slice(0, index + 1).reduce<number>((previous, stepStart, i) => {
    const rebased = stepStart != null ? parseTime(stepStart) : null
    return rebased ?? (i === 0 ? start : previous + step)
  }, 0)

  return {
    minutes: minutes % MINUTES_PER_DAY,
    step,
    hour12: stepStarts.reduce<boolean | null>(
      (accum, stepStart) => accum ?? (stepStart != null ? literalHour12(stepStart) : null),
      null,
    ),
    stepStart: stepStarts[index],
  }
}

export default getBulletTime
