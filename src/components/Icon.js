import React from 'react'

const Icon = ({ onclick, id, svg }) => {
    return <div className="toolbar-icon" onClick={ () => onclick(id)} >
        { svg }
    </div>
}

export default Icon
