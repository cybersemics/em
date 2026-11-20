package com.emtheapp.em;

import android.os.Build;
import android.os.Bundle;
import android.view.textclassifier.TextClassifier;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.emtheapp.em.BuildConfig;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // When the keyboard (IME) opens, Android sends window insets to the FrameLayout that contains the WebView.
        // This causes the WebView to resize, which causes the viewport to resize and breaks position: fixed elements.
        // To fix this, we can strip the insets so the FrameLayout (and therefore the WebView) don't resize when the keyboard
        // opens.
        //
        // This is the Android equivalent of Capacitor's iOS Keyboard { resize: 'none' }, but because that option doesn't
        // exist on Android, we have to do it manually instead.
        
        ViewCompat.setOnApplyWindowInsetsListener(
            findViewById(android.R.id.content),
            (view, insets) -> new WindowInsetsCompat.Builder(insets)
                .setInsets(WindowInsetsCompat.Type.ime(), Insets.NONE)
                .build()
        );

        // For debug (development) builds, use a custom WebViewClient that ignores SSL errors
        // so the app can connect to the local HTTPS dev server with vite's self-signed certificate.

        if (BuildConfig.DEBUG) {
            this.bridge.setWebViewClient(new DevServerWebViewClient(this.bridge));
        }

        // Disable Smart Text Selection. After a double tap or long press selects a word, the WebView asks the system
        // TextClassifier to suggest a selection and adopts its suggestion, which on a short single-line thought is the
        // whole thought rather than the tapped word. NO_OP suggests the selection unchanged, so the word stays selected.
        // TextClassifier.NO_OP and WebView.setTextClassifier exist only on Android 8 (API 26) and later.

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            this.bridge.getWebView().setTextClassifier(TextClassifier.NO_OP);
        }
    }
}
