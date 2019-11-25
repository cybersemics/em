import * as localForage from "localforage";

// SIDE EFFECTS: localStorage
export const helperComplete = ({ helpers }, { id }) => {
  localForage.setItem('helper-complete-' + id, true).catch(err=> {
  	throw new Error(err);
  })
  return {
    showHelper: null,
    helpers: Object.assign({}, helpers, {
      [id]: Object.assign({}, helpers[id], {
        complete: true
      })
    })
  }
}
