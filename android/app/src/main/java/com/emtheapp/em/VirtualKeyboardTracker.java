package com.emtheapp.em;

import android.os.Build;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsAnimation;
import android.view.WindowMetrics;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;

/** Reports the IME animation's live fraction against the independent WindowMetrics keyboard height. */
@CapacitorPlugin(name = "VirtualKeyboardTracker")
public class VirtualKeyboardTracker extends Plugin {
    private View decorView;
    private float density;
    private int shownHeightPx;
    private int startHeightPx;
    private int lastHeightPx;
    private boolean hiding;
    private boolean animating;

    @Override
    public void load() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return;
        decorView = getActivity().getWindow().getDecorView();
        density = getContext().getResources().getDisplayMetrics().density;

        // Capacitor Keyboard also installs a root animation callback. Install after focus so this
        // observer receives progress, and continue dispatching to the WebView's children.
        decorView.getViewTreeObserver().addOnWindowFocusChangeListener(hasFocus -> {
            if (hasFocus) decorView.post(this::installCallback);
        });
        if (decorView.hasWindowFocus()) decorView.post(this::installCallback);
    }

    private int measuredHeight() {
        WindowMetrics metrics = getActivity().getWindowManager().getCurrentWindowMetrics();
        return metrics.getWindowInsets().getInsets(WindowInsets.Type.ime()).bottom;
    }

    private void send(String phase, int heightPx) {
        JSObject data = new JSObject();
        data.put("phase", phase);
        data.put("height", Math.max(0, heightPx) / density);
        notifyListeners("keyboardProgress", data);
    }

    private void installCallback() {
        decorView.setWindowInsetsAnimationCallback(
            new WindowInsetsAnimation.Callback(WindowInsetsAnimation.Callback.DISPATCH_MODE_CONTINUE_ON_SUBTREE) {
                @Override
                public WindowInsets onProgress(WindowInsets insets, List<WindowInsetsAnimation> animations) {
                    for (WindowInsetsAnimation animation : animations) {
                        if ((animation.getTypeMask() & WindowInsets.Type.ime()) == 0) continue;
                        int measured = measuredHeight();
                        boolean nowHiding = measured == 0;
                        if (!animating || nowHiding != hiding) {
                            hiding = nowHiding;
                            animating = true;
                            startHeightPx = lastHeightPx;
                            send(hiding ? "willHide" : "willShow", startHeightPx);
                        }
                        if (!hiding) shownHeightPx = measured;
                        float fraction = animation.getInterpolatedFraction();
                        lastHeightPx = Math.round(startHeightPx + fraction * ((hiding ? 0 : shownHeightPx) - startHeightPx));
                        send("progress", lastHeightPx);
                        break;
                    }
                    return insets;
                }

                @Override
                public void onEnd(WindowInsetsAnimation animation) {
                    if ((animation.getTypeMask() & WindowInsets.Type.ime()) == 0) return;
                    int measured = measuredHeight();
                    if (measured > 0) shownHeightPx = measured;
                    lastHeightPx = measured;
                    send(measured == 0 ? "didHide" : "didShow", measured);
                    animating = false;
                }
            }
        );
    }
}
