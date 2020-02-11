import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import thunk from 'redux-thunk';
import ThoughtReducer from './ThoughtReducer'
import MainReducer from './MainReducer'

const rootReducer = (state, action) => {
  return MainReducer(state, action);
}

export default () => {
  const store = createStore(rootReducer, {}, composeWithDevTools(
    applyMiddleware(thunk)
  ));
  return { store }
}