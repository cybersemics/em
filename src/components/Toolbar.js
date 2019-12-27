import React from 'react'
import { connect } from 'react-redux'
import { shortcutById } from '../shortcuts'
import Icon from './Icon'

const shortcutIds = [
    'search',
    'bindContext',
    'subcategorizeOne',
    'subcategorizeAll',
    'newUncle',
    'toggleProseView',
];

const toolBar = props => {
    return <div className="toolbar">
        { shortcutIds.map( id=>{
            //console.log(shortcutById(id))
            const shortcutInfo = shortcutById(id);
            const {
                name,
                exec
            } = shortcutInfo;
            return <Icon key = { id } onclick={ exec } id={ id } text={ name } />
        })}
    </div>
}

export const Toolbar =  connect()(toolBar);