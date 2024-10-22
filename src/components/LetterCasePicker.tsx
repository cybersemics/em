import React, { FC, memo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import LetterCaseType from '../@types/LetterCaseType'
import { formatLetterCaseActionCreator as formatLetterCase } from '../actions/formatLetterCase'
import { isTouch } from '../browser'
import useWindowOverflow from '../hooks/useWindowOverflow'
import getThoughtById from '../selectors/getThoughtById'
import themeColors from '../selectors/themeColors'
import applyLetterCase from '../util/applyLetterCase'
import fastClick from '../util/fastClick'
import head from '../util/head'
import TriangleDown from './TriangleDown'
import LowerCaseIcon from './icons/LowerCaseIcon'
import SentenceCaseIcon from './icons/SentenceCaseIcon'
import TitleCaseIcon from './icons/TitleCaseIcon'
import UpperCaseIcon from './icons/UpperCaseIcon'

/** Letter Case Picker component. */
const LetterCasePicker: FC<{ fontSize: number; style?: React.CSSProperties }> = memo(({ fontSize, style }) => {
  const colors = useSelector(themeColors)
  const ref = useRef<HTMLDivElement>(null)
  const dispatch = useDispatch()
  const overflow = useWindowOverflow(ref)

  /** Toggles the Letter Case to the clicked swatch. */
  const toggleLetterCase = (command: LetterCaseType, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()
    dispatch(formatLetterCase(command))
  }
  const selected = useSelector(state => {
    const value = (!!state.cursor && getThoughtById(state, head(state.cursor))?.value) || ''
    if (value === applyLetterCase('LowerCase', value)) return 'LowerCase'
    if (value === applyLetterCase('UpperCase', value)) return 'UpperCase'
    if (value === applyLetterCase('SentenceCase', value)) return 'SentenceCase'
    if (value === applyLetterCase('TitleCase', value)) return 'TitleCase'
    return ''
  })
  const casingTypes: LetterCaseType[] = ['LowerCase', 'UpperCase', 'SentenceCase', 'TitleCase']

  return (
    <div className={css({ userSelect: 'none' })}>
      <div
        ref={ref}
        style={{
          ...style,
        }}
        className={css({
          background: { base: '#ebebeb', _dark: '#141414' },
          borderRadius: '3',
          display: 'inline-block',
          padding: '0.2em 0.25em 0.25em',
          position: 'relative',
          ...(overflow.left ? { left: `${overflow.left}` } : { right: `${overflow.right}` }),
        })}
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

        <div aria-label='letter case swatches' className={css({ whiteSpace: 'wrap' })}>
          {casingTypes.map(type => (
            <div
              key={type}
              title={type}
              style={{ border: `solid 1px ${selected === type ? `${colors.fg}` : 'transparent'}` }}
              className={css({
                margin: '2px',
                lineHeight: '0',
              })}
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
