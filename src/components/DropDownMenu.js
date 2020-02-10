import React from 'react'
import Checked from '../images/iconfinder_done-01_186405.svg'
export const DropDownMenu = ({ isOpen, setFormat, format }) => {
  const formatOptions = [{
    id: 1,
    type: 'Plain Text'
  }, {
    id: 2,
    type: 'HTML'
  }]
  return (
    <div>
      {
        isOpen && <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
          border: '1px solid white',
          width: '108px',
          height: '65px'
        }}>
          { isOpen &&
          formatOptions.map(el => (
            <div
              style={{ cursor: 'pointer' }}
              key={el.id}
              onClick={() => setFormat({ f1: el.type.split(' ').join('').toLocaleLowerCase(), f2: el.type })}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginLeft: '10px'
              }}>
                {
                  el.type === format.f2 ? <img
                    src={Checked}
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
