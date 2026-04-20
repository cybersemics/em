package com.emtheapp.em;

import android.net.http.SslError;
import android.webkit.SslErrorHandler;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

/**
 * For debug (development) builds, extend the default WebViewClient and override
 * the onReceivedSslError method to ignore SSL errors.
 *
 * This allows us to ignore the warnings that come with using a self-signed
 * certificate for the development server.
 *
 * This doesn't cause any security issues because we are still strict in
 * production.
 */
public class DevServerWebViewClient extends BridgeWebViewClient {

    public DevServerWebViewClient(Bridge bridge) {
        super(bridge);
    }

    @Override
    public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
        handler.proceed();
    }
}
