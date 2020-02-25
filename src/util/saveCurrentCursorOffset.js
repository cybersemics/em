import debounce from 'lodash.debounce';

export default function saveCurrentCursorOffset() {
	debounce(() => {
		const offset = window.getSelection().focusOffset;
		localStorage.setItem('currentCursorPosition', offset);
	}, 10)();
}
