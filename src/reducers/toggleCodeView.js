// util
import {
  equalPath,
} from '../util'

/** Toggles the code view. */
export default ({ cursor, codeView }, { value }) => ({
  codeView: equalPath(cursor, codeView) || value === false ? null : cursor
})
