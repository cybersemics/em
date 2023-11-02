import escapeRegex from './escapeRegex'

export const regExpEscapeSelector = new RegExp('[' + escapeRegex(' !"#$%&\'()*+,./:;<=>?@[]^`{|}~') + ']', 'g')

/** Replace characters that are invalid in document.querySelector with their respective character codes. Prepend _ to escape leading digits. */
export const escapeSelector = (s: string): string => '_' + s.replace(regExpEscapeSelector, s => `_${s.charCodeAt(0)}`)

export default escapeSelector
