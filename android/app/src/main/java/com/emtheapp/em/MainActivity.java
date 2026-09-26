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
            registerPlugin(AndroidKeyboardPlugin.class);
        }
        super.onCreate(savedInstanceState);

        // em handles keyboard avoidance itself, using virtualKeyboardStore to position web content.
        // Consume the keyboard (IME) inset before it reaches the WebView so Android/WebView does not
        // also resize or offset the viewport. Applying both would move content twice and make the
        // viewport jump as the keyboard closes. Status/navigation safe-area insets remain available.
        // SystemBars inset padding is disabled in capacitor.config.ts for the same reason.
        // The native keyboard plugin still reads the original geometry above this container.

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
