import { store } from '../store'

// it is used by Editable to hide currently edited thought's supercript on meta validation
export const setSuperscriptVisibility = visible => store.dispatch({ type: 'hideSuperscript', value: !visible })
