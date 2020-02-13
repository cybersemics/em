import React from 'react'
import Checked from '../images/iconfinder_done-01_186405.svg'
import CheckedBlack from '../images/iconfinder_icon-checkmark_black.svg'
export const DropDownMenu = ({ isOpen, setFormat, format, formatOptions, settings: { dark } }) => {
  return (
    <div>
      {
        isOpen && <div className='drop-down-export-wrapper' style={dark ? {
          border: '1px solid white',
        } : {
          border: '1px solid black',
        }}>
          { isOpen &&
          formatOptions.map((el, index) => (
            <div
              style={{ cursor: 'pointer' }}
              key={index}
              onClick={() => setFormat({ f1: el.type.split(' ').join('').toLocaleLowerCase(), f2: el.type })}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginLeft: '10px'
              }}>
                {
                  el.type === format.f2 ? <img
                    src={dark ? Checked : CheckedBlack}
                    alt='Checked'
                    width='16px'
                    height='16px'
                  /> : <div style={{ width: '16px', height: '16px' }}>
                  </div>
                }
                <span style={{ marginLeft: '10px' }}>{el.type}</span>
              </div>
            </div>
          ))
          }
        </div>
      }
      </div>
  )
}
