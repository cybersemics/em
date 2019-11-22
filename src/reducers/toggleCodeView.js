// util
import {
  equalItemsRanked,
} from '../util.js'

export const toggleCodeView = ({ cursor, codeView }, { value }) => ({
  codeView: equalItemsRanked(cursor, codeView) || value === false ? null : cursor
})
