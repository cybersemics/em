//@ts-nocheck

import { escapeRegExp } from './escapeRegExp'

export const regExpEscapeSelector = new RegExp('[' + escapeRegExp(' !"#$%&\'()*+,./:;<=>?@[]^`{|}~') + ']', 'g')

/** Replace characters that are invalid in document.querySelector with their respective character codes. Prepend _ to escape leading digits. */
export const escapeSelector = s => '_' + s.replace(regExpEscapeSelector, s => '_' + s.charCodeAt())
