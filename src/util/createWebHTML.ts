interface IWebHTMLProps {
  placeholder: string
  innerHTML: string
  isEditing?: boolean
}

export enum WEBVIEW_POST_EVENTS {
  onBlur,
  onKeyDown,
  onChange,
  onPaste,
  onFocus,
  onCopy,
}

/**
 * Create html string to be used in WebView.
 */
export const createWebHTML = ({ placeholder, innerHTML, isEditing }: IWebHTMLProps) => `
<html>
<head>
  <style>
    * {
      margin: 0;
    }

    #content:empty:before {
      content: attr(placeholder);
    }

    #content {
      font-size: 55px;
      font-family: Arial;
      background-color: #000;
      color: #fff;
      width: 100%;
      height: 100%;
      outline: none;
    }
  </style>
</head>
<script>
  function getSelectionValues() {
    const { anchorNode, focusNode, anchorOffset, focusOffset } = getSelection();

    window.ReactNativeWebView.postMessage(JSON.stringify({ anchorNode, focusNode, anchorOffset, focusOffset }))
  }

  document.addEventListener("DOMContentLoaded", function () {
    const ele = document.getElementById("content");

    ${isEditing} && ele.focus();

    // Get the placeholder attribute
    const placeholder = ele.getAttribute("placeholder");

    // Set the placeholder as initial content if it's empty
    ele.innerHTML.trim() === "" && (ele.innerHTML = placeholder);

    ele.addEventListener("focus", function (e) {
      const value = e.target.innerHTML;
      value === placeholder && (e.target.innerHTML = "");

      window.ReactNativeWebView.postMessage(JSON.stringify({ event: e, eventType: ${WEBVIEW_POST_EVENTS.onFocus} }))
    });

    ele.addEventListener("blur", function (e) {
      const value = e.target.innerHTML.trim();
      value === "" && (e.target.innerHTML = placeholder);

      window.ReactNativeWebView.postMessage(JSON.stringify({ event: e, text: value, eventType: ${
        WEBVIEW_POST_EVENTS.onBlur
      } }))
    });

    ele.addEventListener("keydown", function (e) {
      const { keyCode, key } = e

      window.ReactNativeWebView.postMessage(JSON.stringify({ event: { keyCode, key }, eventType: ${
        WEBVIEW_POST_EVENTS.onKeyDown
      } }))
    });

    ele.addEventListener("keyup", function (e) {
      const text = e.target.innerHTML.trim()

      window.ReactNativeWebView.postMessage(JSON.stringify({ event: text, eventType: ${WEBVIEW_POST_EVENTS.onChange} }))
    });

    ele.addEventListener("copy", function (e) {
      const selectedText = getSelection().getRangeAt(0).toString();
      e.clipboardData.setData("text/plain", selectedText);
      const content = e.clipboardData.getData('text/plain');
    });

    ele.addEventListener("paste", function (e) {
      const plainText = e.clipboardData.getData('text/plain')
      const htmlText = e.clipboardData.getData('text/html')

      e.preventDefault()
      window.ReactNativeWebView.postMessage(JSON.stringify({
        event: {
          plainText,
          htmlText,
          innerHTML: ele?.innerHTML
        },
        eventType: ${WEBVIEW_POST_EVENTS.onPaste}
      }))
    });
  });
</script>

<body>
  <div
    id="content"
    contenteditable
    placeholder="${placeholder}"
  >
    ${innerHTML || ''}
  </div>
</body>
</html>
  `
