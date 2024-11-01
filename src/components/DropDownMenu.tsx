import React, { CSSProperties } from 'react'
import { css } from '../../styled-system/css'
import ExportOption from '../@types/ExportOption'
import fastClick from '../util/fastClick'

interface DropDownMenuProps {
  dark?: boolean
  isOpen?: boolean
  onSelect?: (option: ExportOption) => void
  options: ExportOption[]
  selected?: ExportOption
  style?: CSSProperties
}

/** A custom drop down menu. */

const DropDownMenu = React.forwardRef<HTMLDivElement, DropDownMenuProps>(
  ({ isOpen, onSelect, selected, options, dark, style }, ref) => {
    return isOpen ? (
      <div
        ref={ref}
        className={css({
          boxShadow: '0 0 10px 0px black',
          // display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
          position: 'absolute',
          right: '3px',
          // padding: '0px 5px',
          zIndex: 'stack',
          backgroundColor: 'bg',
          border: `1px solid {colors.fg}`,
          top: '120%',
          left: 0, // position on the left edge of "Plain Text", otherwise the left side gets cut off on mobile
          display: 'table', // the only value that seems to overflow properly within the inline-flex element
          padding: 0,
        })}
        style={style}
      >
        {options.map(option => (
          <div
            className={css({
              cursor: 'pointer',
              padding: '2px 0px',
              borderTop: '1px solid #444',
              transition: 'opacity {durations.fastDuration} ease-in',
            })}
            // composite key is unique
            key={`${option.type}-${option.label}`}
            {...fastClick(() => {
              if (onSelect) {
                onSelect(option)
              }
            })}
          >
            <div className={css({ display: 'flex', alignItems: 'center', marginLeft: '10px' })}>
              {option.label === (selected || options[0]).label ? (
                dark ? (
                  <svg width='16px' height='16px' viewBox='0 0 32 32'>
                    <path
                      d='M30.171,6.131l-0.858-0.858c-0.944-0.945-2.489-0.945-3.433,0L11.294,19.859l-5.175-5.174  c-0.943-0.944-2.489-0.944-3.432,0.001l-0.858,0.857c-0.943,0.944-0.943,2.489,0,3.433l7.744,7.75c0.944,0.945,2.489,0.945,3.433,0  L30.171,9.564C31.112,8.62,31.112,7.075,30.171,6.131z'
                      fill='#fff'
                    />
                  </svg>
                ) : (
                  <svg height='16px' width='16px' viewBox='0 0 512 512'>
                    <path d='M461.6,109.6l-54.9-43.3c-1.7-1.4-3.8-2.4-6.2-2.4c-2.4,0-4.6,1-6.3,2.5L194.5,323c0,0-78.5-75.5-80.7-77.7  c-2.2-2.2-5.1-5.9-9.5-5.9c-4.4,0-6.4,3.1-8.7,5.4c-1.7,1.8-29.7,31.2-43.5,45.8c-0.8,0.9-1.3,1.4-2,2.1c-1.2,1.7-2,3.6-2,5.7  c0,2.2,0.8,4,2,5.7l2.8,2.6c0,0,139.3,133.8,141.6,136.1c2.3,2.3,5.1,5.2,9.2,5.2c4,0,7.3-4.3,9.2-6.2L462,121.8  c1.2-1.7,2-3.6,2-5.8C464,113.5,463,111.4,461.6,109.6z' />
                  </svg>
                )
              ) : (
                <div className={css({ width: '16px', height: '16px' })}></div>
              )}
              <span className={css({ marginLeft: '10px', width: '95px' })}>{option.label}</span>
            </div>
          </div>
        ))}
      </div>
    ) : null
  },
)

export default DropDownMenu
