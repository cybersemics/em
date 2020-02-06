import React from 'react'
import '../App.css'
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
        isOpen && <div className='drop-down-export-wrapper'>
          { isOpen &&
          formatOptions.map(el => (
            <div
              style={{ cursor: 'pointer' }}
              key={el.id}
              onClick={() => setFormat({ f1: el.type.split(' ').join('').toLocaleLowerCase(), f2: el.type })}>
              <div className='drop-down-export-element'>
                {
                  el.type === format.f2 ? <img
                    src={Checked}
                    alt='Checked'
                    width='16px'
                    height='16px'
                  /> : <div className='drop-down-export-empty-div'>
                  </div>
                }
                <span className='drop-down-export-type'>{el.type}</span>
              </div>
            </div>
          ))
          }
        </div>
      }
      </div>
  )
}
