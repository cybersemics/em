package com.emtheapp.em;

import android.content.Context;
import android.util.AttributeSet;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import com.getcapacitor.CapacitorWebView;

/** Preserves keyboard layout while Chromium disconnects a blurred editor. */
public class KeyboardWebView extends CapacitorWebView {
    private int lastInputType;
    private int lastImeOptions;

    public KeyboardWebView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    @Override
    public InputConnection onCreateInputConnection(EditorInfo attrs) {
        InputConnection connection = super.onCreateInputConnection(attrs);
        // Keep the connection null on blur. TYPE_NULL can make an IME change its layout
        // while its existing closing animation still uses the old height.
        if (android.os.Build.VERSION.SDK_INT < 30) return connection;
        if (connection != null && attrs.inputType != 0) {
            lastInputType = attrs.inputType;
            lastImeOptions = attrs.imeOptions;
        } else if (connection == null && lastInputType != 0) {
            attrs.inputType = lastInputType;
            attrs.imeOptions = lastImeOptions;
        }
        return connection;
    }
}
