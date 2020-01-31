import { combineReducers, createStore,applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import thunk from 'redux-thunk';
import ThoughtReducer from './ThoughtReducer'

const AppReducers = combineReducers({
  ThoughtReducer
});

const rootReducer = (state, action) => {
    return AppReducers(state, action);
}
 
export default () => {
  const store = createStore(rootReducer,{},composeWithDevTools(
    applyMiddleware(thunk)
));
  return { store }
}

