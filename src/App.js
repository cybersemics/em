import './App.css'
import sampleData from './sample-data.js'
import React, { Component } from 'react'
import { Provider, connect } from 'react-redux'
import { createStore } from 'redux'

/**************************************************************
 * Store & Reducer
 **************************************************************/

const maxDepth=5
const initialState = {
  focus: 'root'
}

const appReducer = (state = initialState, action) => {
  console.log('DISPATCH', action)
  switch(action.type) {
    case 'navigate':
      return Object.assign({}, state, {
        focus: action.to
      })
    default:
      return state
  }
}

const store = createStore(appReducer)

const AppComponent = connect(state => {
  return { focus: state.focus }
})(({ focus, dispatch }) =>
  <div className='content'>
    <Item id={focus} />
    <div className='keyboard' />
  </div>
)

const Item = connect()(({ id, depth=0, dispatch }) => {
  const data = sampleData[id]
  return <div className={'item container-depth' + depth}>
    <div className={'depth' + depth}>
      <a onClick={() => dispatch({ type: 'navigate', to: data.id })}>{data.value}</a>
    </div>
    {depth < maxDepth ? data.children.map(childId => <Item key={childId} id={childId} depth={depth + 1}/>)
    : null}
  </div>
})

const App = () => <Provider store={store}>
  <AppComponent/>
</Provider>

export default App
