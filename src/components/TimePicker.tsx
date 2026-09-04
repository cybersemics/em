import React, { FC, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import SimplePath from '../@types/SimplePath'
import { deleteAttributeActionCreator as deleteAttribute } from '../actions/deleteAttribute'
import { setBulletStyleActionCreator as setBulletStyle } from '../actions/setBulletStyle'
import { setDescendantActionCreator as setDescendant } from '../actions/setDescendant'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import getBulletTime from '../selectors/getBulletTime'
import rootedParentOf from '../selectors/rootedParentOf'
import fastClick from '../util/fastClick'
import formatTime from '../util/formatTime'
import head from '../util/head'
import Popover from './Popover'

const MINUTES_PER_DAY = 24 * 60

// Step options in display order. The literal is written as the child of =children/=bullet/Time.
const STEP_OPTIONS = ['5min', '15min', '30min', '1h']

/** Stops an event from reaching the bullet (click, long press) and Content (a click on empty space closes all dropdowns). Events bubble through the React tree even from a portal. */
const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation()

/** A selectable option in the Time bullet popover. */
const TimeOption: FC<{ label: string; isSelected?: boolean; onSelect: () => void }> = ({
  label,
  isSelected,
  onSelect,
}) => (
  <div
    aria-label={label}
    className={css({
      margin: '2px',
      padding: '2px 8px',
      lineHeight: '1.5',
      textAlign: 'center',
      border: isSelected ? `solid 1px {colors.fg}` : `solid 1px {colors.transparent}`,
      cursor: 'pointer',
      borderRadius: '2px',
    })}
    {...fastClick(onSelect)}
  >
    {label}
  </div>
)

/**
 * A popover anchored beneath a Time bullet. Offers a scrollable list of times at the list's step, centered on the
 * thought's current time, which writes `=stepStart` on the thought; the step options, which rewrite the step under
 * `=children/=bullet/Time`; and Clear time, which deletes the thought's `=stepStart` so the derived time resumes.
 *
 * Rendered into document.body, because the tree node's transform and will-change ancestors form stacking contexts
 * that would let the thoughts below paint over a popover rendered in place.
 */
const TimePicker: FC<{
  /** The bullet's svg, beneath which the popover is centered. */
  anchor: React.RefObject<SVGSVGElement | null>
  simplePath: SimplePath
}> = ({ anchor, simplePath }) => {
  const dispatch = useDispatch()
  const fontSize = useSelector(state => state.fontSize)
  const bulletTime = useSelector(state => getBulletTime(state, head(simplePath)), shallowEqual)
  const listRef = useRef<HTMLDivElement>(null)
  // The page coordinates of the bottom center of the bullet, measured once when the popover opens.
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)

  const step = bulletTime?.step ?? 0
  const slots = Array.from({ length: step ? Math.ceil(MINUTES_PER_DAY / step) : 0 }, (_, i) => i * step)

  useLayoutEffect(() => {
    const rect = anchor.current?.getBoundingClientRect()
    if (!rect) return
    setPosition({ left: rect.x + rect.width / 2 + window.scrollX, top: rect.bottom + window.scrollY })
  }, [anchor])

  // Center the list on the thought's current time.
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list || !bulletTime) return
    const rowHeight = list.scrollHeight / slots.length
    list.scrollTop = (bulletTime.minutes / step) * rowHeight - list.clientHeight / 2 + rowHeight / 2
  }, [bulletTime, position, slots.length, step])

  if (!bulletTime || !position) return null
  const { minutes, hour12, stepStart } = bulletTime

  /** Closes the popover. */
  const close = () => toggleDropdown({ dropDownType: 'timePicker', value: false })

  return createPortal(
    <div
      aria-label='time picker'
      className={css({ position: 'absolute', zIndex: 'popup' })}
      style={position}
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
      onTouchStart={stopPropagation}
      onTouchEnd={stopPropagation}
    >
      <Popover show size={fontSize} style={{ left: 0, marginTop: 0 }}>
        <div aria-label='time options' className={css({ fontSize: '0.8rem', whiteSpace: 'nowrap' })}>
          <div
            ref={listRef}
            aria-label='time list'
            className={css({ maxHeight: '9em', overflowY: 'auto', position: 'relative' })}
          >
            {slots.map(slot => (
              <TimeOption
                key={slot}
                label={formatTime(slot, { hour12 })}
                isSelected={slot === minutes}
                onSelect={() =>
                  dispatch([
                    // Write the literal with its day period or zero-padded hour so that it is unambiguous when parsed
                    // back, and so that the list keeps rendering in the same clock.
                    setDescendant({
                      path: simplePath,
                      values: ['=stepStart', formatTime(slot, { hour12, dayPeriod: true })],
                    }),
                    close(),
                  ])
                }
              />
            ))}
          </div>
          <div aria-label='step options' className={css({ display: 'flex', marginTop: '0.25em' })}>
            {STEP_OPTIONS.map(option => (
              <TimeOption
                key={option}
                label={option}
                isSelected={option === `${step}min` || option === `${step / 60}h`}
                onSelect={() =>
                  dispatch((dispatch, getState) =>
                    dispatch([
                      setBulletStyle({
                        simplePath: rootedParentOf(getState(), simplePath),
                        value: 'Time',
                        step: option,
                      }),
                      close(),
                    ]),
                  )
                }
              />
            ))}
          </div>
          {stepStart != null && (
            <TimeOption
              label='Clear time'
              onSelect={() => dispatch([deleteAttribute({ path: simplePath, value: '=stepStart' }), close()])}
            />
          )}
        </div>
      </Popover>
    </div>,
    document.body,
  )
}

export default TimePicker
