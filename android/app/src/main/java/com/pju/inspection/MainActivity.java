package com.pju.inspection;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyuGaufOtMkVaqo6Pc5wCPHCTKqK9IktDg6Z38J2F-8usitdYuVNduyPV8Iw6HA8xjjew/exec";
    private static final String PREF_REMEMBER = "remember";
    private static final String PREF_LOGGED_IN = "logged_in";
    private static final int REQ_CAMERA = 101;
    private static final int REQ_LOCATION = 102;

    // Akun bawaan untuk akses aplikasi Android. Dapat diganti di source code.
    private static final String LOGIN_USER = "admin";
    private static final String LOGIN_PASSWORD = "pju1234";

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private PermissionRequest pendingPermissionRequest;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(16, 42, 67));
        getWindow().setNavigationBarColor(Color.rgb(16, 42, 67));

        boolean loggedIn = getPreferences(Context.MODE_PRIVATE).getBoolean(PREF_LOGGED_IN, false);
        boolean remember = getPreferences(Context.MODE_PRIVATE).getBoolean(PREF_REMEMBER, false);
        if (loggedIn && remember) showApp(); else showLogin();
    }

    private int dp(float value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private TextView label(String text) {
        TextView v = new TextView(this);
        v.setText(text);
        v.setTextColor(Color.rgb(16, 42, 67));
        v.setTextSize(14);
        v.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        v.setPadding(0, dp(8), 0, dp(6));
        return v;
    }

    private void showLogin() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(244, 247, 251));

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(dp(24), dp(36), dp(24), dp(24));
        scroll.addView(root, new ViewGroup.LayoutParams(-1, -1));

        TextView icon = new TextView(this);
        icon.setText("⚡");
        icon.setTextSize(42);
        icon.setGravity(Gravity.CENTER);
        icon.setTextColor(Color.rgb(18, 97, 214));
        root.addView(icon, new LinearLayout.LayoutParams(-1, dp(58)));

        TextView title = new TextView(this);
        title.setText("PJU INSPECTION PRO");
        title.setTextSize(25);
        title.setTextColor(Color.rgb(16, 42, 67));
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        TextView subtitle = new TextView(this);
        subtitle.setText("Sistem Manajemen Aset • Inspeksi • GIS • Tindak Lanjut");
        subtitle.setTextSize(13);
        subtitle.setTextColor(Color.rgb(91, 108, 125));
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setPadding(0, dp(6), 0, dp(22));
        root.addView(subtitle, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(22), dp(20), dp(22), dp(22));
        card.setBackgroundColor(Color.WHITE);
        root.addView(card, new LinearLayout.LayoutParams(-1, -2));

        TextView loginTitle = new TextView(this);
        loginTitle.setText("Masuk ke Aplikasi");
        loginTitle.setTextSize(20);
        loginTitle.setTextColor(Color.rgb(16, 42, 67));
        loginTitle.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        card.addView(loginTitle, new LinearLayout.LayoutParams(-1, -2));

        TextView hint = new TextView(this);
        hint.setText("Masukkan akun untuk membuka PJU Inspection PRO.");
        hint.setTextSize(13);
        hint.setTextColor(Color.rgb(91, 108, 125));
        hint.setPadding(0, dp(5), 0, dp(12));
        card.addView(hint, new LinearLayout.LayoutParams(-1, -2));

        card.addView(label("Username"), new LinearLayout.LayoutParams(-1, -2));
        EditText username = new EditText(this);
        username.setSingleLine(true);
        username.setHint("Username");
        username.setText(LOGIN_USER);
        username.setTextSize(16);
        card.addView(username, new LinearLayout.LayoutParams(-1, dp(52)));

        card.addView(label("Password"), new LinearLayout.LayoutParams(-1, -2));
        EditText password = new EditText(this);
        password.setSingleLine(true);
        password.setHint("Password");
        password.setTextSize(16);
        password.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);
        card.addView(password, new LinearLayout.LayoutParams(-1, dp(52)));

        CheckBox remember = new CheckBox(this);
        remember.setText("Ingat saya di perangkat ini");
        remember.setTextSize(13);
        remember.setTextColor(Color.rgb(70, 84, 98));
        remember.setChecked(getPreferences(Context.MODE_PRIVATE).getBoolean(PREF_REMEMBER, false));
        card.addView(remember, new LinearLayout.LayoutParams(-1, dp(48)));

        Button login = new Button(this);
        login.setText("MASUK");
        login.setTextSize(15);
        login.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        login.setTextColor(Color.WHITE);
        login.setAllCaps(false);
        login.setBackgroundColor(Color.rgb(18, 97, 214));
        LinearLayout.LayoutParams loginParams = new LinearLayout.LayoutParams(-1, dp(52));
        loginParams.topMargin = dp(6);
        card.addView(login, loginParams);

        TextView info = new TextView(this);
        info.setText("PJU Inspection PRO • Android");
        info.setTextSize(12);
        info.setTextColor(Color.rgb(120, 132, 145));
        info.setGravity(Gravity.CENTER);
        info.setPadding(0, dp(20), 0, 0);
        card.addView(info, new LinearLayout.LayoutParams(-1, -2));

        login.setOnClickListener(v -> {
            String u = username.getText().toString().trim();
            String p = password.getText().toString();
            if (LOGIN_USER.equals(u) && LOGIN_PASSWORD.equals(p)) {
                getPreferences(Context.MODE_PRIVATE).edit()
                        .putBoolean(PREF_LOGGED_IN, true)
                        .putBoolean(PREF_REMEMBER, remember.isChecked())
                        .apply();
                showApp();
            } else {
                password.setError("Username atau password salah");
                password.requestFocus();
            }
        });

        setContentView(scroll);
    }

    private void showApp() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(244, 247, 251));

        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        root.addView(container, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(dp(16), 0, dp(8), 0);
        toolbar.setBackgroundColor(Color.rgb(16, 42, 67));

        TextView title = new TextView(this);
        title.setText("⚡  PJU INSPECTION PRO");
        title.setTextColor(Color.WHITE);
        title.setTextSize(17);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        toolbar.addView(title, new LinearLayout.LayoutParams(0, -1, 1));

        Button logout = new Button(this);
        logout.setText("Keluar");
        logout.setTextColor(Color.WHITE);
        logout.setTextSize(12);
        logout.setAllCaps(false);
        logout.setBackgroundColor(Color.TRANSPARENT);
        toolbar.addView(logout, new LinearLayout.LayoutParams(dp(72), dp(52)));
        container.addView(toolbar, new LinearLayout.LayoutParams(-1, dp(58)));

        webView = new WebView(this);
        container.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);

        configureWebView();
        webView.loadUrl(WEB_APP_URL);

        logout.setOnClickListener(v -> {
            getPreferences(Context.MODE_PRIVATE).edit()
                    .putBoolean(PREF_LOGGED_IN, false)
                    .putBoolean(PREF_REMEMBER, false)
                    .apply();
            if (webView != null) webView.clearCache(false);
            showLogin();
        });
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(false);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                try {
                    Intent intent = params.createIntent();
                    startActivityForResult(intent, 200);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    Toast.makeText(MainActivity.this, "Pemilih foto tidak tersedia", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                        checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                    pendingGeoOrigin = origin;
                    pendingGeoCallback = callback;
                    requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOCATION);
                } else {
                    callback.invoke(origin, true, false);
                }
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean needsCamera = false;
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) needsCamera = true;
                    }
                    if (needsCamera && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                            checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                        pendingPermissionRequest = request;
                        requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
                    } else {
                        request.grant(request.getResources());
                    }
                });
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 200 && filePathCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_LOCATION) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (pendingGeoCallback != null) {
                pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
                pendingGeoCallback = null;
                pendingGeoOrigin = null;
            }
        } else if (requestCode == REQ_CAMERA) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (pendingPermissionRequest != null) {
                if (granted) pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
                else pendingPermissionRequest.deny();
                pendingPermissionRequest = null;
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
