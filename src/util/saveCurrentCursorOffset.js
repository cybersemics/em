import debounce from 'lodash.debounce';

export default function saveCurrentCursorOffset() {
	debounce(() => {
		const offset = window.getSelection().focusOffset;
		const isInitialSelectionComingFromReload = offset.anchorNode === null;

		if (!isInitialSelectionComingFromReload) {
			localStorage.setItem('currentCursorPosition', offset);
		}
	}, 100)();
}
