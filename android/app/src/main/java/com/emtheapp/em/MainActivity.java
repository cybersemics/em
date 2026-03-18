package com.emtheapp.em;

import android.os.Bundle;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

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
    }
}
