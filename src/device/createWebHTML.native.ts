interface IWebHTMLProps {
  placeholder: string
  innerHTML: string
  isEditing?: boolean
  isTable?: boolean
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
export const createWebHTML = ({ placeholder, innerHTML, isEditing, isTable }: IWebHTMLProps) => `
<html>
<head>
  <style>
    * {
      margin: 0;
    }

    #content:empty:before {
      content: attr(placeholder);
      font-style: italic;
      opacity: 0.5;
    }

    #content {
      font-size: 55px;
      font-family: Arial;
      background-color: #000;
      color: #fff;
      width: 100%;
      height: 100%;
      outline: none;
      ${isTable && `text-align: right;`}
    }
  </style>
</head>
<script>
  function getSelectionValues() {
    const { anchorNode, focusNode, anchorOffset, focusOffset } = getSelection();

    window.ReactNativeWebView.postMessage(JSON.stringify({ anchorNode, focusNode, anchorOffset, focusOffset }))
  }

  function setEndOfContenteditable(contentEditableElement){
      var range,selection;
      if(document.createRange)//Firefox, Chrome, Opera, Safari, IE 9+
      {
          range = document.createRange();//Create a range (a range is a like the selection but invisible)
          range.selectNodeContents(contentEditableElement);//Select the entire contents of the element with the range
          range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
          selection = window.getSelection();//get the selection object (allows you to change selection)
          selection.removeAllRanges();//remove any selections already made
          selection.addRange(range);//make the range you have just created the visible selection
      }
      else if(document.selection)//IE 8 and lower
      {
          range = document.body.createTextRange();//Create a range (a range is a like the selection but invisible)
          range.moveToElementText(contentEditableElement);//Select the entire contents of the element with the range
          range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
          range.select();//Select the range (make it the visible selection
      }
  }

  function focusInput() {
    try{
      const ele = document.getElementById("content");
      ele.focus();
      setEndOfContenteditable(ele)
    } catch(e){
      window.ReactNativeWebView.postMessage(JSON.stringify({ error: e }))
    }
  }

  function blurInput() {
    document.getElementById('content').blur();
  }

  window.onload = function (e) {
    e.preventDefault()

    ${isEditing} ? focusInput() : blurInput()
  };

  document.addEventListener("DOMContentLoaded", function () {
    const ele = document.getElementById("content");

    // Get the placeholder attribute
    const placeholder = ele.getAttribute("placeholder");

    // Set the placeholder as initial content if it's empty
    ele.innerHTML.trim() === "" && (ele.innerHTML = placeholder);

    ele.addEventListener("focus", function (e) {
      const value = e.target.innerHTML.trim();
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
    contenteditable="true"
    placeholder="${placeholder}"
  >
    ${innerHTML || ''}
  </div>
</body>
</html>
  `
