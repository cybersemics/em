import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import thunk from 'redux-thunk';
import ThoughtReducer from '../src/reducers/ThoughtReducer'

export default () => {
  const store = createStore(ThoughtReducer, {}, composeWithDevTools(
    applyMiddleware(thunk)
  ));
  return { store }
}

