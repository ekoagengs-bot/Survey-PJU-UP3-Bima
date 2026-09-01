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
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyuGaufOtMkVaqo6Pc5wCPHCTKqK9IktDg6Z38J2F-8usitdYuVNduyPV8Iw6HA8xjjew/exec";
    private static final String PREF_LOGGED_IN = "logged_in";
    private static final String PREF_EMAIL = "email";
    private static final String PREF_NAME = "name";
    private static final String PREF_ULP = "ulp";
    private static final String PREF_REMEMBER = "remember";
    private static final int REQ_CAMERA = 101;
    private static final int REQ_LOCATION = 102;
    private static final int REQ_FILE = 200;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private PermissionRequest pendingPermissionRequest;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;
    private EditText emailInput;
    private EditText passwordInput;
    private Button loginButton;
    private ProgressBar loginProgress;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

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
        root.setPadding(dp(24), dp(34), dp(24), dp(24));
        scroll.addView(root, new ViewGroup.LayoutParams(-1, -1));

        TextView icon = new TextView(this);
        icon.setText("⚡");
        icon.setTextSize(44);
        icon.setGravity(Gravity.CENTER);
        icon.setTextColor(Color.rgb(18, 97, 214));
        root.addView(icon, new LinearLayout.LayoutParams(-1, dp(62)));

        TextView title = new TextView(this);
        title.setText("PJU INSPECTION PRO");
        title.setTextSize(25);
        title.setTextColor(Color.rgb(16, 42, 67));
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        TextView subtitle = new TextView(this);
        subtitle.setText("Aplikasi Android Pemeriksaan & Monitoring PJU");
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
        loginTitle.setText("Masuk");
        loginTitle.setTextSize(20);
        loginTitle.setTextColor(Color.rgb(16, 42, 67));
        loginTitle.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        card.addView(loginTitle, new LinearLayout.LayoutParams(-1, -2));

        TextView hint = new TextView(this);
        hint.setText("Gunakan akun petugas yang terdaftar di USERS.");
        hint.setTextSize(12);
        hint.setTextColor(Color.rgb(91, 108, 125));
        hint.setPadding(0, dp(5), 0, dp(10));
        card.addView(hint, new LinearLayout.LayoutParams(-1, -2));

        card.addView(label("Email"));
        emailInput = new EditText(this);
        emailInput.setSingleLine(true);
        emailInput.setHint("nama@domain.com");
        emailInput.setText(getPreferences(Context.MODE_PRIVATE).getString(PREF_EMAIL, ""));
        emailInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        emailInput.setTextSize(16);
        card.addView(emailInput, new LinearLayout.LayoutParams(-1, dp(52)));

        card.addView(label("Password"));
        passwordInput = new EditText(this);
        passwordInput.setSingleLine(true);
        passwordInput.setHint("Password");
        passwordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        passwordInput.setTextSize(16);
        card.addView(passwordInput, new LinearLayout.LayoutParams(-1, dp(52)));

        CheckBox remember = new CheckBox(this);
        remember.setText("Ingat saya di perangkat ini");
        remember.setTextSize(13);
        remember.setTextColor(Color.rgb(70, 84, 98));
        remember.setChecked(getPreferences(Context.MODE_PRIVATE).getBoolean(PREF_REMEMBER, false));
        card.addView(remember, new LinearLayout.LayoutParams(-1, dp(48)));

        loginProgress = new ProgressBar(this);
        loginProgress.setVisibility(android.view.View.GONE);
        LinearLayout.LayoutParams progressParams = new LinearLayout.LayoutParams(-2, dp(34));
        progressParams.gravity = Gravity.CENTER_HORIZONTAL;
        card.addView(loginProgress, progressParams);

        loginButton = new Button(this);
        loginButton.setText("MASUK");
        loginButton.setTextSize(15);
        loginButton.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        loginButton.setTextColor(Color.WHITE);
        loginButton.setAllCaps(false);
        loginButton.setBackgroundColor(Color.rgb(18, 97, 214));
        card.addView(loginButton, new LinearLayout.LayoutParams(-1, dp(52)));

        TextView footer = new TextView(this);
        footer.setText("ULP • PJU Inspection PRO • Android");
        footer.setTextSize(11);
        footer.setTextColor(Color.rgb(120, 132, 145));
        footer.setGravity(Gravity.CENTER);
        footer.setPadding(0, dp(18), 0, 0);
        root.addView(footer, new LinearLayout.LayoutParams(-1, -2));

        loginButton.setOnClickListener(v -> doLogin(remember.isChecked()));
        setContentView(scroll);
    }

    private void doLogin(boolean remember) {
        final String email = emailInput.getText().toString().trim();
        final String password = passwordInput.getText().toString();
        if (email.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Email dan password wajib diisi.", Toast.LENGTH_SHORT).show();
            return;
        }

        loginButton.setEnabled(false);
        loginButton.setText("MEMERIKSA...");
        loginProgress.setVisibility(android.view.View.VISIBLE);

        executor.execute(() -> {
            boolean ok = false;
            String message = "Login gagal.";
            String name = "";
            String ulp = "";
            try {
                URL url = new URL(WEB_APP_URL);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setRequestMethod("POST");
                conn.setConnectTimeout(20000);
                conn.setReadTimeout(20000);
                conn.setDoOutput(true);
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");

                JSONObject body = new JSONObject();
                body.put("action", "login");
                body.put("email", email);
                body.put("password", password);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                    os.flush();
                }

                InputStream stream = conn.getResponseCode() >= 400 ? conn.getErrorStream() : conn.getInputStream();
                JSONObject result = new JSONObject(readAll(stream));
                ok = result.optBoolean("ok", false);
                message = result.optString("message", message);
                name = result.optString("nama", "");
                ulp = result.optString("ulp", "");
                conn.disconnect();
            } catch (Exception e) {
                message = "Tidak dapat terhubung ke server. Periksa internet.";
            }

            final boolean loginOk = ok;
            final String loginMessage = message;
            final String loginName = name;
            final String loginUlp = ulp;
            mainHandler.post(() -> {
                loginButton.setEnabled(true);
                loginButton.setText("MASUK");
                loginProgress.setVisibility(android.view.View.GONE);
                if (loginOk) {
                    getPreferences(Context.MODE_PRIVATE).edit()
                            .putBoolean(PREF_LOGGED_IN, true)
                            .putBoolean(PREF_REMEMBER, remember)
                            .putString(PREF_EMAIL, email)
                            .putString(PREF_NAME, loginName)
                            .putString(PREF_ULP, loginUlp)
                            .apply();
                    showApp();
                } else {
                    passwordInput.setError(loginMessage);
                    passwordInput.requestFocus();
                }
            });
        });
    }

    private String readAll(InputStream stream) throws Exception {
        if (stream == null) return "{}";
        BufferedReader br = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) sb.append(line);
        br.close();
        return sb.toString();
    }

    private void showApp() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.WHITE);

        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        root.addView(container, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(dp(14), 0, dp(6), 0);
        toolbar.setBackgroundColor(Color.rgb(16, 42, 67));

        LinearLayout brandBox = new LinearLayout(this);
        brandBox.setOrientation(LinearLayout.VERTICAL);
        brandBox.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = new TextView(this);
        title.setText("⚡  PJU INSPECTION PRO");
        title.setTextColor(Color.WHITE);
        title.setTextSize(17);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        brandBox.addView(title);
        TextView user = new TextView(this);
        String nama = getPreferences(Context.MODE_PRIVATE).getString(PREF_NAME, "");
        String ulp = getPreferences(Context.MODE_PRIVATE).getString(PREF_ULP, "");
        user.setText((nama.isEmpty() ? "Petugas" : nama) + (ulp.isEmpty() ? "" : " • " + ulp));
        user.setTextColor(Color.rgb(205, 219, 232));
        user.setTextSize(10);
        brandBox.addView(user);
        toolbar.addView(brandBox, new LinearLayout.LayoutParams(0, -1, 1));

        Button logout = new Button(this);
        logout.setText("Keluar");
        logout.setTextColor(Color.WHITE);
        logout.setTextSize(11);
        logout.setAllCaps(false);
        logout.setBackgroundColor(Color.TRANSPARENT);
        toolbar.addView(logout, new LinearLayout.LayoutParams(dp(70), dp(52)));
        container.addView(toolbar, new LinearLayout.LayoutParams(-1, dp(62)));

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
            if (webView != null) webView.loadUrl("about:blank");
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

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), REQ_FILE);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    callback.onReceiveValue(null);
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
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
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
        if (requestCode == REQ_FILE && filePathCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_LOCATION && pendingGeoCallback != null) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        }
        if (requestCode == REQ_CAMERA && pendingPermissionRequest != null) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (granted) pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
            else pendingPermissionRequest.deny();
            pendingPermissionRequest = null;
        }
    }

    @Override
    protected void onDestroy() {
        executor.shutdownNow();
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
}
