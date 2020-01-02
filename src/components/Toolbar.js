import React from 'react'
import { connect } from 'react-redux'
import { shortcutById } from '../shortcuts'
import { overlayReveal, overlayHide } from '../action-creators/toolbar'

const shortcutIds = [
  'outdent',
  'indent',
  'delete',
  'toggleContextView',
  'exportContext',
  'search',
]

const ToolbarMessageOverlay = ({ name, description }) => {
    return (
        <div className={'toolbar-overlay'}>
            <div className={'overlay-name'}>{ name }</div>
            <div className={'overlay-body'}>{ description }</div>
        </div>
    )
}

var holdTimer
var currentId

const clickOrHoldAction = (id, name, description) => {
    currentId = id
    // on chrome setTimeout doesn't seem to work on the first click, clearing it before hand fixes the problem
    clearTimeout(holdTimer)

    holdTimer = setTimeout(() => {
        const info = {
            id,
            name,
            description
        }
        overlayReveal(info)
    }, 500)

    return false
}

const clearHoldTimer = () => {
    overlayHide()
    clearTimeout(holdTimer)
    return false
}

export const Toolbar = connect(({ toolbarOverlay, settings: { dark } }) => ({ dark, toolbarOverlay }))(({ dark, toolbarOverlay: { showOverlay, shortcutId, shortcutName, shortcutDescription } }) =>
    <div className={'toolbar-container'}>
        <div className="toolbar">
            { shortcutIds.map(id => {
                const { name, svg: Icon, description, exec } = shortcutById(id)
                return (
                    <div
                        key={ name }
                        id={ id }
                        className="toolbar-icon"
                        onTouchStart={ () => clickOrHoldAction(id, name, description) }
                        onTouchEnd={ clearHoldTimer }
                        onTouchMove={ clearHoldTimer }
                        onMouseUp={ clearHoldTimer }
                        onMouseDown={ () => clickOrHoldAction(id, name, description) }
                        onClick={ () => exec(id) }
                    >
                        <Icon fill={dark ? 'white' : 'black'} />
                    </div>
                )
            })}
        </div>
        { showOverlay && shortcutId === currentId ?
            <ToolbarMessageOverlay name={shortcutName} description={shortcutDescription} /> :
        null }
    </div>)
