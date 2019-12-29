import React from 'react'
import { connect } from 'react-redux'
import { shortcutById } from '../shortcuts'

const shortcutIds = [
    'search',
    'bindContext',
    'subcategorizeOne',
    'subcategorizeAll',
    'newUncle',
    'toggleProseView',
]

const toolBar = () => {
    return <div className="toolbar">
        { shortcutIds.map(id => {
            //  console.log(shortcutById(id))
            const { name, svg, exec } = shortcutById(id)
            return (
                <div key ={ name } className="toolbar-icon" onClick={ () => exec(id)} >
                    { svg }
                </div>
            )
        })}
    </div>
}

export const Toolbar = connect()(toolBar)
