// util
import {
  equalPath,
} from '../util.js'

export default ({ cursor, codeView }, { value }) => ({
  codeView: equalPath(cursor, codeView) || value === false ? null : cursor
})
