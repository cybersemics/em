import React from 'react'
import Checked from '../images/iconfinder_done-01_186405.svg'
import CheckedBlack from '../images/iconfinder_icon-checkmark_black.svg'

const DropDownMenu = ({ isOpen, onSelect, selected, options, dark }) =>
  <React.Fragment>
    {isOpen && <div className='drop-down-wrapper' style={{
      border: '1px solid ' + (dark ? 'white' : 'black'),
    }}>
      {options.map((option, index) =>
        <div
          style={{ cursor: 'pointer' }}
          key={index}
          onClick={() => {
            onSelect(option)
          }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginLeft: '10px'
          }}>
            {
              option.type === (selected || options[0]).type ? <img
                src={dark ? Checked : CheckedBlack}
                alt='Checked'
                width='16px'
                height='16px'
              /> : <div style={{ width: '16px', height: '16px' }}>
              </div>
            }
            <span style={{ marginLeft: '10px' }}>{option.label}</span>
          </div>
        </div>
      )}
    </div>}
  </React.Fragment>

export default DropDownMenu
