// util
import {
  equalThoughtsRanked,
} from '../util.js'

export const toggleCodeView = ({ cursor, codeView }, { value }) => ({
  codeView: equalThoughtsRanked(cursor, codeView) || value === false ? null : cursor
})
