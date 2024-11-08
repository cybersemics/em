import escapeRegex from './escapeRegex'

// replace characters that are invalid in document.querySelector with their respective character codes
// prepend _ to escape leading digits
const regExpEscapeSelector = new RegExp('[' + escapeRegex(' !"#$%&\'()*+,./:;<=>?@[]^`{|}~') + ']', 'g')

export default regExpEscapeSelector
