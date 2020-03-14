// constants
import {
  EM_TOKEN
} from '../constants.js'

import setFirstSubthought from './setFirstSubthought'

export default (state, { key, value, local, remote }) =>
  setFirstSubthought(state, {
    context: [EM_TOKEN, 'Settings'].concat(key),
    value: value.toString(),
    local,
    remote,
  })
