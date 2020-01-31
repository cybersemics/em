import flow from 'lodash.flow'
import emojiStrip from 'emoji-strip'
import * as pluralize from 'pluralize'

export const getComparisonToken = flow([
  value => value.toLowerCase(),
  value => value.replace(
    value.length > 0 && value.replace(/\W/g, '').length > 0 ? /\W/g : /s/g,
    ''
  ),
  value => emojiStrip(value).length > 0 ? emojiStrip(value) : value,
  pluralize.singular
])