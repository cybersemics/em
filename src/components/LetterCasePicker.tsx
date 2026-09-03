import React, { FC, memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import LetterCaseType from '../@types/LetterCaseType'
import { formatLetterCaseActionCreator as formatLetterCase } from '../actions/formatLetterCase'
import { isTouch } from '../browser'
import getThoughtById from '../selectors/getThoughtById'
import applyLetterCase from '../util/applyLetterCase'
import fastClick from '../util/fastClick'
import head from '../util/head'
import Popover from './Popover'
import LowerCaseIcon from './icons/LowerCaseIcon'
import SentenceCaseIcon from './icons/SentenceCaseIcon'
import TitleCaseIcon from './icons/TitleCaseIcon'
import UpperCaseIcon from './icons/UpperCaseIcon'

/** Letter Case Picker component. */
const LetterCasePicker: FC<{ size?: number }> = memo(({ size }) => {
  const dispatch = useDispatch()
  const showLetterCase = useSelector(state => state.showLetterCase)

  /** Toggles the Letter Case to the clicked swatch. */
  const toggleLetterCase = (command: LetterCaseType, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()
    dispatch(formatLetterCase(command))
  }
  const selected = useSelector(state => {
    const value = (!!state.cursor && getThoughtById(state, head(state.cursor))?.value) || ''

    // The letter case of the thought should be independent of its formatting.
    const doc = new DOMParser().parseFromString(value, 'text/html')
    const { textContent } = doc.body

    if (textContent === applyLetterCase('LowerCase', textContent)) return 'LowerCase'
    if (textContent === applyLetterCase('UpperCase', textContent)) return 'UpperCase'
    if (textContent === applyLetterCase('SentenceCase', textContent)) return 'SentenceCase'
    if (textContent === applyLetterCase('TitleCase', textContent)) return 'TitleCase'
    return ''
  })
  const casingTypes: LetterCaseType[] = ['LowerCase', 'UpperCase', 'SentenceCase', 'TitleCase']

  return (
    <Popover show={showLetterCase} size={size}>
      <div aria-label='letter case swatches' className={css({ whiteSpace: 'wrap' })}>
        {casingTypes.map(type => (
          <div
            key={type}
            title={type.replace(/([a-z])([A-Z])/g, '$1 $2')}
            className={css({
              margin: '2px',
              lineHeight: '0',
              border: selected === type ? `solid 1px {colors.fg}` : `solid 1px {colors.transparent}`,
            })}
            aria-label={type}
            data-selected={selected === type ? 'true' : 'false'}
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
    </Popover>
  )
})
LetterCasePicker.displayName = 'LetterCasePicker'

export default LetterCasePicker
