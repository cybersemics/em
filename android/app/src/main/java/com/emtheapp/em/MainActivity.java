package com.emtheapp.em;

import android.os.Bundle;
import android.os.Build;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.emtheapp.em.BuildConfig;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            registerPlugin(VirtualKeyboardTracker.class);
        }
        super.onCreate(savedInstanceState);

        // Strip the IME inset before it reaches the WebView container. SystemBars inset handling is disabled in
        // capacitor.config.ts so that it does not also pad the decor view by the keyboard height.
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
    }
}
