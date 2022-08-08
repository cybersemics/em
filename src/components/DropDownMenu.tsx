import React, { CSSProperties } from 'react'
import { useSelector } from 'react-redux'
import ExportOption from '../@types/ExportOption'
import Checked from '../images/iconfinder_done-01_186405.svg'
import CheckedBlack from '../images/iconfinder_icon-checkmark_black.svg'
import themeColors from '../selectors/themeColors'

interface DropDownMenuProps {
  dark?: boolean
  isOpen?: boolean
  onSelect?: (option: ExportOption) => void
  options: ExportOption[]
  selected?: ExportOption
  style?: CSSProperties
}

/** A custom drop down menu. */
// eslint-disable-next-line react/display-name
const DropDownMenu = React.forwardRef<HTMLDivElement, DropDownMenuProps>(
  ({ isOpen, onSelect, selected, options, dark, style }, ref) => {
    const colors = useSelector(themeColors)
    return isOpen ? (
      <div
        ref={ref}
        className='drop-down-wrapper'
        style={{
          border: `1px solid ${colors.fg}`,
          ...style,
        }}
      >
        {options.map((option, index) => (
          <div
            className='drop-down-option-wrapper'
            key={index}
            onClick={() => {
              if (onSelect) {
                onSelect(option)
              }
            }}
          >
            <div className='drop-down-option'>
              {option.label === (selected || options[0]).label ? (
                <img src={dark ? Checked : CheckedBlack} alt='Checked' width='16px' height='16px' />
              ) : (
                <div style={{ width: '16px', height: '16px' }}></div>
              )}
              <span className='drop-down-label'>{option.label}</span>
            </div>
          </div>
        ))}
      </div>
    ) : null
  },
)

export default DropDownMenu
