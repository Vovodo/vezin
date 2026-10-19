package com.rfqcollector.vezin;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

public class MainActivity extends Activity {
    private static final String BAR_SCRIPT =
            "(function(){function sync(){var el=document.querySelector('.app-shell')||document.body;"
                    + "var c=getComputedStyle(el).backgroundColor;"
                    + "var m=c&&c.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);"
                    + "if(!m||!window.VezinBars)return;"
                    + "var y=(0.2126*(+m[1])+0.7152*(+m[2])+0.0722*(+m[3]))/255;"
                    + "VezinBars.setBars(m[1]+','+m[2]+','+m[3],y>0.62);}"
                    + "sync();"
                    + "if(!window.__vezinBarsWatch){window.__vezinBarsWatch=new MutationObserver(sync);"
                    + "window.__vezinBarsWatch.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['data-theme']});}"
                    + "})();";
    private static final String NATIVE_SAFE_SCRIPT =
            "(function(){var s=document.getElementById('vezin-native-safe');"
                    + "if(!s){s=document.createElement('style');s.id='vezin-native-safe';document.head.appendChild(s);}"
                    + "s.textContent='.app-shell{padding-top:0!important;padding-right:0!important;padding-bottom:0!important;padding-left:0!important}.modal-backdrop{padding:18px!important}';"
                    + "})();";

    private WebView webView;
    private FrameLayout root;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#f2efe5"));
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUserAgentString(settings.getUserAgentString() + " VezinApp");
        webView.addJavascriptInterface(new BarBridge(), "VezinBars");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                applyHosts(view);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                view.evaluateJavascript(NATIVE_SAFE_SCRIPT, null);
                view.evaluateJavascript(BAR_SCRIPT, null);
            }
        });
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int left;
            int top;
            int right;
            int bottom;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.graphics.Insets bars = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                left = bars.left;
                top = bars.top;
                right = bars.right;
                bottom = bars.bottom;
            } else {
                left = insets.getSystemWindowInsetLeft();
                top = insets.getSystemWindowInsetTop();
                right = insets.getSystemWindowInsetRight();
                bottom = insets.getSystemWindowInsetBottom();
            }
            view.setPadding(left, top, right, bottom);
            return insets;
        });
        setContentView(root);
        webView.loadUrl(BuildConfig.FRONTEND_URL);
    }

    private final class BarBridge {
        @JavascriptInterface
        public void setBars(String rgb, boolean lightBackground) {
            runOnUiThread(() -> {
                String[] parts = rgb.split(",");
                if (parts.length == 3) {
                    try {
                        int color = Color.rgb(
                                Integer.parseInt(parts[0].trim()),
                                Integer.parseInt(parts[1].trim()),
                                Integer.parseInt(parts[2].trim()));
                        root.setBackgroundColor(color);
                    } catch (NumberFormatException ignored) {
                    }
                }
                applyBarContrast(lightBackground);
            });
        }
    }

    private void applyBarContrast(boolean lightBackground) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller == null) return;
            int bits = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                    | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
            controller.setSystemBarsAppearance(lightBackground ? bits : 0, bits);
            return;
        }
        View decor = getWindow().getDecorView();
        int flags = decor.getSystemUiVisibility();
        int light = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        decor.setSystemUiVisibility(lightBackground ? (flags | light) : (flags & ~light));
    }

    private void applyHosts(WebView view) {
        String script = "window.__VEZIN_CONFIG__={"
                + "apiUrl:'" + BuildConfig.API_URL + "',"
                + "frontendUrl:'" + BuildConfig.FRONTEND_URL + "'"
                + "};";
        view.evaluateJavascript(script, null);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
