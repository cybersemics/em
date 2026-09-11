import React, { FC, memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import LetterCaseType from '../@types/LetterCaseType'
import { formatLetterCaseActionCreator as formatLetterCase } from '../actions/formatLetterCase'
import { isTouch } from '../browser'
import getThoughtById from '../selectors/getThoughtById'
import selectedPaths from '../selectors/selectedPaths'
import applyLetterCase from '../util/applyLetterCase'
import fastClick from '../util/fastClick'
import head from '../util/head'
import Popover from './Popover'
import LowerCaseIcon from './icons/LowerCaseIcon'
import SentenceCaseIcon from './icons/SentenceCaseIcon'
import TitleCaseIcon from './icons/TitleCaseIcon'
import UpperCaseIcon from './icons/UpperCaseIcon'

const casingTypes: LetterCaseType[] = ['LowerCase', 'UpperCase', 'SentenceCase', 'TitleCase']

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
    // The swatches are only rendered while the picker is open, and deriving the letter case of a large multiselection
    // is not free, so there is nothing to derive until then.
    if (!state.showLetterCase) return ''

    // The selected swatch is the letter case of the thoughts that formatLetterCase edits, i.e. the multiselection when
    // there is one, which may have no cursor at all once the Home button has dismissed it (#4844).
    const paths = selectedPaths(state)
    // No swatch is selected when there is nothing to edit, otherwise `every` below would be vacuously true and
    // highlight the first letter case.
    if (!paths.length) return ''

    const texts = paths.map(path => {
      const value = getThoughtById(state, head(path))?.value || ''
      // The letter case of the thought should be independent of its formatting.
      return new DOMParser().parseFromString(value, 'text/html').body.textContent ?? ''
    })

    return casingTypes.find(type => texts.every(text => text === applyLetterCase(type, text))) ?? ''
  })

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
