import React, { FC, memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import LetterCaseType from '../@types/LetterCaseType'
import { formatLetterCaseActionCreator as formatLetterCase } from '../actions/formatLetterCase'
import { isTouch } from '../browser'
import getSelectedLetterCase from '../selectors/getSelectedLetterCase'
import fastClick from '../util/fastClick'
import Popover from './Popover'
import LowerCaseIcon from './icons/LowerCaseIcon'
import SentenceCaseIcon from './icons/SentenceCaseIcon'
import TitleCaseIcon from './icons/TitleCaseIcon'
import UpperCaseIcon from './icons/UpperCaseIcon'

const casingTypes: LetterCaseType[] = ['LowerCase', 'UpperCase', 'SentenceCase', 'TitleCase']

/** Letter Case Picker component. */
const LetterCasePicker: FC<{ size?: number }> = memo(({ size }) => {
  const dispatch = useDispatch()
  const showLetterCase = useSelector(
    state => state.activeDropdown?.surface === 'toolbar' && state.activeDropdown.picker === 'letterCase',
  )

  /** Toggles the Letter Case to the clicked swatch. */
  const toggleLetterCase = (command: LetterCaseType, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()
    dispatch(formatLetterCase(command))
  }
  const selected = useSelector(state =>
    state.activeDropdown?.surface === 'toolbar' && state.activeDropdown.picker === 'letterCase'
      ? getSelectedLetterCase(state)
      : '',
  )

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
            // Apply the option on touchend rather than touchstart. React registers touchstart passively, so the handler's
            // preventDefault is a no-op there and the browser goes on to synthesize mouse events from the tap, which
            // land on the thought under the dropdown (#5608).
            onTouchEnd={e => isTouch && toggleLetterCase(type, e)}
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
