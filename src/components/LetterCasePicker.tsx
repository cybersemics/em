import React, { FC, memo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { SystemStyleObject } from '../../styled-system/types'
import LetterCaseType from '../@types/LetterCaseType'
import { formatLetterCaseActionCreator as formatLetterCase } from '../actions/formatLetterCase'
import { isTouch } from '../browser'
import useWindowOverflow from '../hooks/useWindowOverflow'
import getThoughtById from '../selectors/getThoughtById'
import applyLetterCase from '../util/applyLetterCase'
import fastClick from '../util/fastClick'
import head from '../util/head'
import TriangleDown from './TriangleDown'
import LowerCaseIcon from './icons/LowerCaseIcon'
import SentenceCaseIcon from './icons/SentenceCaseIcon'
import TitleCaseIcon from './icons/TitleCaseIcon'
import UpperCaseIcon from './icons/UpperCaseIcon'

/** Letter Case Picker component. */
const LetterCasePicker: FC<{ fontSize: number; cssRaw?: SystemStyleObject }> = memo(({ fontSize, cssRaw }) => {
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
        style={{ ...(overflow.left ? { left: `${overflow.left}` } : { right: `${overflow.right}` }) }}
        className={css(
          {
            background: 'letterCasePickerBg',
            borderRadius: '3',
            display: 'inline-block',
            padding: '0.2em 0.25em 0.25em',
            position: 'relative',
          },
          cssRaw,
        )}
      >
        <TriangleDown
          fill={token('colors.fgOverlay90')}
          size={fontSize}
          cssRaw={{ position: 'absolute', width: '100%' }}
          style={{ ...(overflow.left ? { left: -overflow.left } : { right: -overflow.right }), top: -fontSize / 2 }}
        />

        <div aria-label='letter case swatches' className={css({ whiteSpace: 'wrap' })}>
          {casingTypes.map(type => (
            <div
              key={type}
              title={type}
              className={css({
                margin: '2px',
                lineHeight: '0',
                border: selected === type ? `solid 1px {colors.fg}` : `solid 1px {colors.transparent}`,
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
