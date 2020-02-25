import { isMobile } from '../browser.js';
import { store } from '../store.js';

// util
import { restoreSelection } from '../util/restoreSelection';
import { restoreCursorBeforeSearch } from '../util/restoreCursorBeforeSearch';

const restoreCursor = () => (dispatch) => {
	const state = store.getState();
	const cursorOld = state.cursor;
	if (cursorOld) {
		if (cursorOld.length > 0) {
			if (!isMobile || state.editing) {
				restoreSelection(cursorOld);
			}
		} else {
			document.activeElement.blur();
			document.getSelection().removeAllRanges();
		}
	} else if (state.search === '') {
		dispatch({ type: 'search', value: null });
		restoreCursorBeforeSearch();
	}
};

export default restoreCursor;
