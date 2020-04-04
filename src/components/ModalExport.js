import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Modal from './Modal'
import DropDownMenu from './DropDownMenu.js'
import ArrowDownWhite from '../images/keyboard_arrow_down_352466.svg'
import ArrowDownBlack from '../images/iconfinder_ic_keyboard_arrow_down_black_352466.svg'
import ClipboardJS from 'clipboard'

//  util's.js
import {
  download,
  ellipsize,
  exportContext,
  getDescendants,
  getSetting,
  headValue,
  pathToContext,
  timestamp
} from '../util'

import alert from '../action-creators/alert'
import globals from '../globals'

const exportOptions = [
  { type: 'text/plain', label: 'Plain Text', extension: 'txt' },
  { type: 'text/html', label: 'HTML', extension: 'html' },
]

const clipboard = new ClipboardJS('.copy-clipboard-btn')

const ModalExport = () => {

  const dispatch = useDispatch()
  const cursor = useSelector(state => state.cursor)

  const [selected, setSelected] = useState(exportOptions[0])
  const [isOpen, setIsOpen] = useState(false)
  const [wrapperRef, setWrapper] = useState()
  const [exportContent, setExportContent] = useState('')

  const dark = getSetting('Theme') !== 'Light'
  const descendants = cursor ? getDescendants(cursor) : []
  const exportMessage = cursor ? `Export "${ellipsize(headValue(cursor))}"` + (descendants.length > 0 ? ` and ${descendants.length} subthought${descendants.length === 1 ? '' : 's'} as ${selected.label}` : '') : null

  useEffect(() => {
    document.addEventListener('click', onClickOutside)

    if (cursor) {
      setExportContent(exportContext(pathToContext(cursor), selected.type))
    }

    return () => {
      document.removeEventListener('click', onClickOutside)
    }
  })

  clipboard.on('success', function (e) {
    alert(`Thoughts copied`)
    clearTimeout(globals.errorTimer)
    globals.errorTimer = window.setTimeout(() => alert(null), 10000)
  })

  clipboard.on('error', function (e) {
    alert(`Thoughts could not be copied`)
    clearTimeout(globals.errorTimer)
    globals.errorTimer = window.setTimeout(() => alert(null), 10000)
  })

  const onClickOutside = e => {
    if (isOpen && wrapperRef && !wrapperRef.contains(e.target)) {
      setIsOpen(false)
      e.stopPropagation()
    }
  }

  const onExportClick = () => {

    const exported = exportContext(pathToContext(cursor), selected.type)
    const title = ellipsize(headValue(cursor))

    // use mobile share if it is available
    if (navigator.share) {
      navigator.share({
        text: exported,
        title,
      })
    }
    // otherwise download the data with createObjectURL
    else {
      try {
        download(exported, `em-${title}-${timestamp()}.${selected.extension}`, selected.type)
      }
      catch (e) {
        dispatch({ type: 'error', value: e.message })
        console.error('Download Error', e.message)
      }
    }

    dispatch({ type: 'modalRemindMeLater', id: 'export' })
  }

  const closeModal = () => {
    alert(null)
    dispatch({ type: 'modalRemindMeLater', id: 'help' })
  }

  return (
    <Modal id='export' title={navigator.share ? 'Share' : 'Download'} className='popup'>
      <div className='modal-export-wrapper'>
        <span className='modal-content-to-export'>{exportMessage}</span>
        <span className='modal-drop-down-holder'>
          <img
            src={dark ? ArrowDownWhite : ArrowDownBlack}
            alt='Arrow'
            height='22px'
            width='22px'
            style={{ cursor: 'pointer' }}
            onClick={e => setIsOpen(!isOpen)}
          />
          <div ref={setWrapper}>
            <DropDownMenu
              isOpen={isOpen}
              selected={selected}
              onSelect={option => {
                setSelected(option)
                setIsOpen(false)
              }}
              options={exportOptions}
              dark={dark}
            />
          </div>
        </span>
      </div>
      <div className="cp-clipboard-wrapper">
        <a data-clipboard-text={exportContent} className="copy-clipboard-btn">Copy to clipboard</a>
      </div>
      <div className='modal-export-btns-wrapper'>
        <button className='modal-btn-export' style={dark
          ? {
            color: 'black',
            backgroundColor: 'white',
          } : {
            color: 'white',
            backgroundColor: 'black',
          }
        } onClick={onExportClick}
        >{navigator.share ? 'Share' : 'Download'}</button>
        <button
          className='modal-btn-cancel'
          style={{
            fontSize: '14px',
            color: dark ? 'white' : 'black'
          }}
          onClick={closeModal}>
          Cancel
        </button>
      </div>
    </Modal>
  )
}

export default ModalExport
