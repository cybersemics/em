import React, { FC, memo, useLayoutEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { titleCase } from 'title-case'
import { formatLetterCaseActionCreator as formatLetterCase } from '../actions/formatLetterCase'
import { isTouch } from '../browser'
import getThoughtById from '../selectors/getThoughtById'
import themeColors from '../selectors/themeColors'
import fastClick from '../util/fastClick'
import head from '../util/head'
import TriangleDown from './TriangleDown'
import LowerCaseIcon from './icons/LowerCaseIcon'
import SentenceCaseIcon from './icons/SentenceCaseIcon'
import TitleCaseIcon from './icons/TitleCaseIcon'
import UpperCaseIcon from './icons/UpperCaseIcon'

/** A hook that returns the left and right overflow of the element outside the bounds of the screen. Do not re-calculate on every render or it will create an infinite loop when scrolling the Toolbar. */
const useWindowOverflow = (ref: React.RefObject<HTMLElement>) => {
  const [overflow, setOverflow] = useState({ left: 0, right: 0 })

  useLayoutEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    // Subtract the previous overflow, since that affects the client rect.
    // Otherwise the overflow will alternate on each render as it moves on and off the screen.
    const left = Math.max(0, -rect.x + 15 - overflow.left)
    // add 10px for padding
    const right = Math.max(0, rect.x + rect.width - window.innerWidth + 10 - overflow.right)
    if (left > 0 || right > 0) {
      setOverflow({ left, right })
    }
  }, [ref, overflow.left, overflow.right])

  return overflow
}

/** Letter Case Picker component. */
const LetterCasePicker: FC<{ fontSize: number; style?: React.CSSProperties }> = memo(({ fontSize, style }) => {
  const colors = useSelector(themeColors)
  const ref = useRef<HTMLDivElement>(null)
  const dispatch = useDispatch()
  const overflow = useWindowOverflow(ref)

  /** Toggles the Letter Case to the clicked swatch. */
  const toggleLetterCase = (command: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()
    dispatch(formatLetterCase(command))
  }
  const selected = useSelector(state => {
    const value = (!!state.cursor && getThoughtById(state, head(state.cursor))?.value) || ''
    if (value === value.toLowerCase()) return 'LowerCase'
    if (value === value.toUpperCase()) return 'UpperCase'
    const sentenceCaseRegex = /(^\w|\.\s*\w)/gi
    if (value === value.toLowerCase().replace(sentenceCaseRegex, match => match.toUpperCase())) return 'SentenceCase'
    if (value === titleCase(value.toLowerCase())) return 'TitleCase'
    return ''
  })
  const casingTypes = ['LowerCase', 'UpperCase', 'SentenceCase', 'TitleCase']

  return (
    <div style={{ userSelect: 'none' }}>
      <div
        ref={ref}
        style={{
          backgroundColor: colors.fgOverlay90,
          borderRadius: 3,
          display: 'inline-block',
          padding: '0.2em 0.25em 0.25em',
          position: 'relative',
          ...(overflow.left ? { left: overflow.left } : { right: overflow.right }),
          ...style,
        }}
      >
        <TriangleDown
          fill={colors.fgOverlay90}
          size={fontSize}
          style={{
            position: 'absolute',
            ...(overflow.left ? { left: -overflow.left } : { right: -overflow.right }),
            top: -fontSize / 2,
            width: '100%',
          }}
        />

        <div aria-label='letter case swatches' style={{ whiteSpace: 'wrap' }}>
          {casingTypes.map(type => (
            <div
              key={type}
              title={type}
              style={{
                border: `solid 1px ${selected === type ? colors.fg : 'transparent'}`,
                margin: '2px',
                lineHeight: 0,
              }}
              aria-label={type}
              {...fastClick(e => e.stopPropagation())}
              onTouchStart={e => toggleLetterCase(type, e)}
              onMouseDown={e => !isTouch && toggleLetterCase(type, e)}
            >
              {type === 'LowerCase' && <LowerCaseIcon />}
              {type === 'UpperCase' && <UpperCaseIcon />}
              {type === 'SentenceCase' && <SentenceCaseIcon />}
              {type === 'TitleCase' && <TitleCaseIcon />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})
LetterCasePicker.displayName = 'LetterCasePicker'

export default LetterCasePicker
