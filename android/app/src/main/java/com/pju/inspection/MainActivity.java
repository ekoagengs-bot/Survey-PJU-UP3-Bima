package com.pju.inspection;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
    // Live PJU Inspection PRO Google Apps Script deployment.
    private static final String WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyuGaufOtMkVaqo6Pc5wCPHCTKqK9IktDg6Z38J2F-8usitdYuVNduyPV8Iw6HA8xjjew/exec";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        openWebApp();
    }

    private void openWebApp() {
        Uri uri = Uri.parse(WEB_APP_URL);
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        intent.setPackage("com.android.chrome");

        try {
            startActivity(intent);
            finish();
            return;
        } catch (ActivityNotFoundException ignored) {
            // Chrome is not installed; use the device's default browser.
        }

        try {
            Intent fallback = new Intent(Intent.ACTION_VIEW, uri);
            startActivity(fallback);
            finish();
        } catch (ActivityNotFoundException e) {
            showFallbackPage();
        }
    }

    private void showFallbackPage() {
        WebView webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.setWebViewClient(new WebViewClient());
        setContentView(webView);
        webView.loadUrl(WEB_APP_URL);
        Toast.makeText(this,
                "Browser tidak ditemukan. PJU Inspection PRO dibuka di WebView.",
                Toast.LENGTH_LONG).show();
    }
}
