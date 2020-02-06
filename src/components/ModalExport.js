import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Modal } from './Modal.js'
import { DropDownMenu } from './DropDownMenu.js'
import ArrowDown from '../images/keyboard_arrow_down_352466.svg'
//  util's.js
import {
  ellipsize,
  headValue,
  getDescendants
} from '../util'

export const ModalExport = () => {
  const dispatch = useDispatch()
  const cursor = useSelector(state => state.cursor)
  const execFunc = useSelector(state => state.execFunc)
  const [format, setFormat] = React.useState({ f1: 'plaintext', f2: 'Plain Text' })
  const [isOpen, handleMenu] = React.useState(false)
  const exportInfo = `${ellipsize(headValue(cursor))} and ${getDescendants(cursor).length} subthoughts as ${format.f2} `
  return (
    <Modal id='export' title='Export' className='popup'>
      <div style={{
        display: 'flex',
        justifyContent: 'flex-start'
      }}>
        <div style={{ minWidth: '249.25px' }}>{`Export ${exportInfo} `}</div>
        <div style={{ display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          height: '62px',
          width: '58.719px',
          marginLeft: '8px'
        }}>
          <img
            src={ArrowDown}
            alt='Arrow'
            height='22px'
            width='22px'
            style={{ cursor: 'pointer' }}
            onClick={() => handleMenu(!isOpen)}
          />
          <DropDownMenu
            isOpen={isOpen}
            setFormat={setFormat}
            format={format}
          />
        </div>
      </div>
      <button style={{
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
        background: 'none',
        color: '#fff',
        textDecoration: 'underline'
      }}
        onClick={(e) => execFunc('exportContext').exec(e, format.f1)}>
        Export
      </button>
      <button style={{
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
        background: 'none',
        color: '#fff',
      }}
        onClick={(e) => {
        dispatch({ type: 'modalRemindMeLater', id: 'help' })
      }}>
        Cancel
      </button>
    </Modal>
  )
}
