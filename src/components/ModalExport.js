import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Modal } from './Modal.js'
import { DropDownMenu } from './DropDownMenu.js'
import ArrowDown from '../images/keyboard_arrow_down_352466.svg'
//  util's.js
import {
  ellipsize,
  headValue,
  getDescendants,
  download,
  exportContext,
  pathToContext,
  timestamp
} from '../util'

const formatOptions = [{
  id: 1,
  type: 'Plain Text'
}, {
  id: 2,
  type: 'HTML'
}]

export const ModalExport = () => {
  const dispatch = useDispatch()
  const cursor = useSelector(state => state.cursor)
  const [format, setFormat] = useState({ f1: 'plaintext', f2: 'Plain Text' })
  const [isOpen, handleMenu] = useState(false)
  const [wrapperRef, setWrapper] = useState()
  const exportInfo = `"${ellipsize(headValue(cursor))}" and ${getDescendants(cursor).length} subthoughts as ${format.f2} `
  const exportFunc = (exportType) => {
    if (exportType === 'plaintext') {
      const exported = exportContext(pathToContext(cursor), 'plaintext')
      download(exported, `em-${timestamp()}.txt`, 'text/plain')
      dispatch({ type: 'modalRemindMeLater', id: 'export' })
    }
    else if (exportType === 'html') {
      const exported = exportContext(pathToContext(cursor), 'html')
      download(exported, `em-${timestamp()}.html`, 'text/html')
      dispatch({ type: 'modalRemindMeLater', id: 'export' })
    }
  }
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
  })
  const setWrapperRef = (node) => {
    setWrapper(node)
  }
  const handleClickOutside = (event) => {
    if (wrapperRef && !wrapperRef.contains(event.target)) {
      handleMenu(false)
    }
  };
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
          { <div ref={setWrapperRef}>
            <DropDownMenu
            isOpen={isOpen}
            setFormat={setFormat}
            format={format}
            formatOptions={formatOptions}
          />
          </div> }
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
        onClick={() => exportFunc(format.f1)}>
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
