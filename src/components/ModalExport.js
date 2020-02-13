import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Modal } from './Modal.js'
import { DropDownMenu } from './DropDownMenu.js'
import ArrowDownWhite from '../images/keyboard_arrow_down_352466.svg'
import ArrowDownBlack from '../images/iconfinder_ic_keyboard_arrow_down_black_352466.svg'
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
  type: 'Plain Text'
}, {
  type: 'HTML'
}]

export const ModalExport = () => {
  const dispatch = useDispatch()
  const cursor = useSelector(state => state.cursor)
  const settings = useSelector(state => state.settings)
  const [format, setFormat] = useState({ f1: 'plaintext', f2: 'Plain Text' })
  const [isOpen, handleMenu] = useState(false)
  const [wrapperRef, setWrapper] = useState()
  // const imgToShow = settings.dark ? ArrowDownWhite : ArrowDownBlack
  const subsOrSub = getDescendants(cursor).length === 1 ? 'subthought' : 'subthoughts'
  const exportInfo = `"${ellipsize(headValue(cursor))}" and ${getDescendants(cursor).length} ${subsOrSub} as ${format.f2} `
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
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
  }, [])
  const setWrapperRef = (node) => {
    setWrapper(node)
  }
  const handleClickOutside = (event) => {
    if (wrapperRef && !wrapperRef.contains(event.target)) {
      handleMenu(false)
    }
  }
  return (
    <Modal id='export' title='Export' className='popup'>
      <div className='modal-export-wrapper'>
        <div className='modal-content-to-export'>{`Export ${exportInfo} `}</div>
        <div className='modal-drop-down-holder'>
          <img
            src={settings.dark ? ArrowDownWhite : ArrowDownBlack}
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
              settings={settings}
            />
          </div> }
        </div>
      </div>
      <div className='modal-export-btns-wrapper'>
        <button className='modal-btn-export' style={settings.dark ? {
          color: 'black',
          backgroundColor: 'white',
        } : {
          color: 'white',
          backgroundColor: 'black',
        }}
          onClick={() => exportFunc(format.f1)}
        >
          Export
        </button>
        <button className='modal-btn-cancel' style={settings.dark ? {
          color: '#fff'
        } : {
          color: '#000'
        }}
          onClick={(e) => {
            dispatch({ type: 'modalRemindMeLater', id: 'help' })
          }}>
          Cancel
        </button>
      </div>
    </Modal>
  )
}
