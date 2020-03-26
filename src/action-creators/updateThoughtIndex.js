import { getSetting } from '../util/getSetting'
import _ from 'lodash'

const updateLocalStorage = _.throttle((thoughtIndex, contextIndex) => {
  const localStorageSettings = ['Font Size', 'Tutorial', 'Autologin', 'Last Updated']
  const localStorageSettingsIndex = localStorageSettings.reduce((acc, item) => (
    { ...acc, [item]: getSetting(item, { thoughtIndex, contextIndex, depth: 0 })[0] }
  ), {})

  Object.keys(localStorageSettingsIndex).forEach(settingName => {
    localStorageSettingsIndex[settingName] && localStorage.setItem(`Settings/${settingName}`, localStorageSettingsIndex[settingName])
  })
}, 1000)

export const updateThoughtIndex = ({ thoughtIndexUpdates = {}, contextIndexUpdates = {}, recentlyEdited, ignoreNullThoughts, forceRender }) => dispatch => {

  updateLocalStorage(thoughtIndexUpdates, contextIndexUpdates)

  dispatch({
    type: 'thoughtIndex',
    thoughtIndexUpdates,
    contextIndexUpdates,
    recentlyEdited,
    ignoreNullThoughts,
    forceRender,
  })

}
