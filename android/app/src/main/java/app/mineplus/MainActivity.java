package app.mineplus;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.ProgressBar;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

public class MainActivity extends AppCompatActivity {
    private static final String APP_URL = "https://list-mine.vercel.app/dashboard";
    private static final String APP_HOST = "list-mine.vercel.app";

    private WebView webView;
    private SwipeRefreshLayout refreshLayout;
    private ProgressBar progressBar;
    private View offlineView;
    private ValueCallback<Uri[]> fileCallback;
    private ConnectivityManager connectivityManager;

    private final ConnectivityManager.NetworkCallback networkCallback = new ConnectivityManager.NetworkCallback() {
        @Override public void onAvailable(@NonNull Network network) {
            runOnUiThread(() -> {
                if (offlineView != null && offlineView.getVisibility() == View.VISIBLE) {
                    offlineView.setVisibility(View.GONE);
                    webView.reload();
                }
            });
        }
    };

    private final ActivityResultLauncher<Intent> filePicker = registerForActivityResult(
        new ActivityResultContracts.StartActivityForResult(),
        result -> {
            if (fileCallback == null) return;
            Uri[] files = WebChromeClient.FileChooserParams.parseResult(result.getResultCode(), result.getData());
            fileCallback.onReceiveValue(files);
            fileCallback = null;
        }
    );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.web_view);
        refreshLayout = findViewById(R.id.refresh_layout);
        progressBar = findViewById(R.id.progress_bar);
        offlineView = findViewById(R.id.offline_view);
        connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        Button retryButton = findViewById(R.id.retry_button);

        configureWebView();
        refreshLayout.setColorSchemeResources(R.color.mineplus_accent, R.color.mineplus_primary);
        refreshLayout.setOnRefreshListener(webView::reload);
        refreshLayout.setOnChildScrollUpCallback((parent, child) -> webView.getScrollY() > 0);
        retryButton.setOnClickListener(view -> {
            offlineView.setVisibility(View.GONE);
            webView.reload();
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack();
                else finish();
            }
        });

        if (savedInstanceState == null) {
            loadIntentUrl(getIntent());
        } else {
            webView.restoreState(savedInstanceState);
        }

        connectivityManager.registerDefaultNetworkCallback(networkCallback);
    }

    private void loadIntentUrl(Intent intent) {
        Uri deepLink = intent.getData();
        webView.loadUrl(deepLink != null && "https".equals(deepLink.getScheme()) && APP_HOST.equals(deepLink.getHost()) ? deepLink.toString() : APP_URL);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setSaveFormData(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " MinePlus/1.1 Android");

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, false);

        if (WebViewFeature.isFeatureSupported(WebViewFeature.START_SAFE_BROWSING)) {
            WebViewCompat.startSafeBrowsing(this, value -> { });
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
                progressBar.setVisibility(View.VISIBLE);
                offlineView.setVisibility(View.GONE);
            }

            @Override public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
                refreshLayout.setRefreshing(false);
                CookieManager.getInstance().flush();
            }

            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                if ("https".equals(uri.getScheme()) && host != null && (APP_HOST.equals(host) || host.endsWith(".supabase.co"))) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
                return true;
            }

            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    progressBar.setVisibility(View.GONE);
                    refreshLayout.setRefreshing(false);
                    offlineView.setVisibility(View.VISIBLE);
                }
            }

        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                progressBar.setVisibility(newProgress < 100 ? View.VISIBLE : View.GONE);
            }

            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    filePicker.launch(params.createIntent());
                    return true;
                } catch (Exception error) {
                    fileCallback = null;
                    return false;
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) ->
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        );
    }

    @Override protected void onSaveInstanceState(@NonNull Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        loadIntentUrl(intent);
    }

    @Override protected void onPause() {
        CookieManager.getInstance().flush();
        webView.onPause();
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override protected void onDestroy() {
        connectivityManager.unregisterNetworkCallback(networkCallback);
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        webView.stopLoading();
        webView.destroy();
        super.onDestroy();
    }
}
