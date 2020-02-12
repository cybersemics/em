import React from 'react'
import Checked from '../images/iconfinder_done-01_186405.svg'
import CheckedBlack from '../images/iconfinder_icon-checkmark_black.svg'
export const DropDownMenu = ({ isOpen, setFormat, format, formatOptions, settings: { dark } }) => {
  const imgToShow = dark ? Checked : CheckedBlack
  return (
    <div>
      {
        isOpen && <div style={dark ? {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
          border: '1px solid white',
          width: '108px',
          height: '65px'
        } : {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
          border: '1px solid black',
          width: '108px',
          height: '65px'
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
                    src={imgToShow}
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
