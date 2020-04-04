// util
import {
  equalPath,
} from '../util'

export default ({ cursor, codeView }, { value }) => ({
  codeView: equalPath(cursor, codeView) || value === false ? null : cursor
})
