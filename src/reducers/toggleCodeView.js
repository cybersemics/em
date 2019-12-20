// util
import {
  equalPath,
} from '../util.js'

export const toggleCodeView = ({ cursor, codeView }, { value }) => ({
  codeView: equalPath(cursor, codeView) || value === false ? null : cursor
})
