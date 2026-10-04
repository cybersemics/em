package com.emtheapp.em;

import android.content.Context;
import android.util.AttributeSet;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import com.getcapacitor.CapacitorWebView;

/**
 * Prevents a keyboard from changing its layout halfway through its closing animation.
 *
 * When a web editable loses focus, Chromium closes its Android input connection and reports
 * "no editor" (TYPE_NULL). Some keyboards respond by rebuilding their layout immediately. For
 * example, Gboard adds a number row while sliding down. Android continues animating the old
 * keyboard height, so a web control following that animation no longer matches the visible edge.
 *
 * Keep only the departing editor's keyboard-layout hints (inputType and imeOptions) on that
 * disconnected update. The keyboard can finish closing with the same layout it started with.
 * The editable still blurs immediately, and we still return null: no input connection, text,
 * selection, or focus is retained. A newly focused editor always supplies its own fresh hints.
 * This is a general disconnect rule, not a check for any particular keyboard application.
 */
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
