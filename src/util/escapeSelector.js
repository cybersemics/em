import { escapeRegExp } from './escapeRegExp'

// replace characters that are invalid in document.querySelector with their respective character codes
// prepend _ to escape leading digits
export const regExpEscapeSelector = new RegExp('[' + escapeRegExp(' !"#$%&\'()*+,./:;<=>?@[]^`{|}~') + ']', 'g')
export const escapeSelector = s => '_' + s.replace(regExpEscapeSelector, s => '_' + s.charCodeAt())
