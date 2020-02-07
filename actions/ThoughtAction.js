import * as Actions from './ActionTypes';

export const addNewThought = (data) => (dispatch)=>{  
   return dispatch({
    type: Actions.ADD_THOUGHT,
    data: data
    })  
}