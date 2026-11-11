package app.kanadojo;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Hülle um die Web-App in assets/index.html.
 * Stellt der Seite über "AndroidBridge" drei Dinge bereit: japanische Sprachausgabe,
 * Systemleisten-Farben und das In-App-Update aus den GitHub-Releases dieses Repos.
 */
public class MainActivity extends Activity implements TextToSpeech.OnInitListener {

    private static final String ACTION_INSTALL = "app.kanadojo.INSTALL_STATUS";

    private WebView web;
    private TextToSpeech tts;
    private volatile String ttsState = "wait";
    private final ExecutorService io = Executors.newSingleThreadExecutor();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(false);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if ("file".equals(u.getScheme())) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception ignored) {
                }
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        web.loadUrl("file:///android_asset/index.html");

        tts = new TextToSpeech(this, this);
        handleInstallStatus(getIntent());
    }

    @Override
    public void onInit(int status) {
        ttsState = "nolang";
        if (status == TextToSpeech.SUCCESS) {
            selectJapanese();
        }
        js("window.__kd&&__kd.onTts('" + ttsState + "')");
    }

    private void selectJapanese() {
        try {
            int r = tts.setLanguage(Locale.JAPAN);
            ttsState = (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) ? "nolang" : "ok";
        } catch (Exception e) {
            ttsState = "nolang";
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Nach der Installation einer Stimme in den Systemeinstellungen erneut prüfen.
        if ("nolang".equals(ttsState) && tts != null) {
            selectJapanese();
            js("window.__kd&&__kd.onTts('" + ttsState + "')");
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleInstallStatus(intent);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.__kd&&__kd.back&&__kd.back())?1:0", v -> {
            if (!"1".equals(v)) {
                finish();
            }
        });
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            tts.shutdown();
        }
        io.shutdownNow();
        super.onDestroy();
    }

    private void js(final String code) {
        runOnUiThread(() -> {
            if (web != null) {
                web.evaluateJavascript(code, null);
            }
        });
    }

    private void installMessage(String msg) {
        js("window.__kd&&__kd.onInstall(" + JSONObject.quote(msg) + ")");
    }

    // ---------- In-App-Update ----------

    private static int codeOf(String tag) {
        int code = 0;
        for (String part : tag.split("[^0-9]+")) {
            if (!part.isEmpty()) {
                try {
                    code = Integer.parseInt(part);
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return code;
    }

    private static String httpGet(String address) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(address).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(20000);
        c.setRequestProperty("Accept", "application/vnd.github+json");
        c.setRequestProperty("User-Agent", "kana-dojo-android");
        try {
            int status = c.getResponseCode();
            if (status == 404) {
                throw new IOException("Noch kein Release vorhanden");
            }
            if (status != 200) {
                throw new IOException("HTTP " + status);
            }
            try (InputStream in = c.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                }
                return out.toString("UTF-8");
            }
        } finally {
            c.disconnect();
        }
    }

    private void checkUpdateNow() {
        JSONObject out = new JSONObject();
        try {
            out.put("current", BuildConfig.VERSION_NAME);
            out.put("available", false);
            if (BuildConfig.UPDATE_REPO.isEmpty()) {
                out.put("error", "In diesem Build ist keine Update-Quelle hinterlegt");
            } else {
                JSONObject rel = new JSONObject(httpGet("https://api.github.com/repos/" + BuildConfig.UPDATE_REPO + "/releases/latest"));
                String tag = rel.optString("tag_name", "");
                String url = "";
                JSONArray assets = rel.optJSONArray("assets");
                if (assets != null) {
                    for (int i = 0; i < assets.length(); i++) {
                        JSONObject a = assets.getJSONObject(i);
                        if (a.optString("name", "").endsWith(".apk")) {
                            url = a.optString("browser_download_url", "");
                            break;
                        }
                    }
                }
                out.put("version", tag.startsWith("v") ? tag.substring(1) : tag);
                out.put("notes", rel.optString("body", ""));
                out.put("url", url);
                out.put("available", codeOf(tag) > BuildConfig.VERSION_CODE && !url.isEmpty());
            }
        } catch (Exception e) {
            try {
                out.put("error", String.valueOf(e.getMessage()));
            } catch (Exception ignored) {
            }
        }
        js("window.__kd&&__kd.onUpdate(" + out.toString() + ")");
    }

    private void downloadAndInstall(String address) {
        String allowed = "https://github.com/" + BuildConfig.UPDATE_REPO + "/releases/download/";
        if (BuildConfig.UPDATE_REPO.isEmpty() || address == null || !address.startsWith(allowed)) {
            installMessage("Unerwartete Download-Adresse, Update abgebrochen.");
            return;
        }
        File apk = new File(getCacheDir(), "update.apk");
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(address).openConnection();
            c.setConnectTimeout(15000);
            c.setReadTimeout(30000);
            c.setRequestProperty("User-Agent", "kana-dojo-android");
            if (c.getResponseCode() != 200) {
                throw new IOException("HTTP " + c.getResponseCode());
            }
            long total = c.getContentLengthLong();
            long done = 0;
            int lastPct = -1;
            try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(apk)) {
                byte[] buf = new byte[65536];
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    done += n;
                    if (total > 0) {
                        int pct = (int) (done * 100 / total);
                        if (pct != lastPct) {
                            lastPct = pct;
                            js("window.__kd&&__kd.onProgress(" + pct + ")");
                        }
                    }
                }
            }
            install(apk);
        } catch (Exception e) {
            installMessage("Download fehlgeschlagen: " + e.getMessage());
        } finally {
            if (c != null) {
                c.disconnect();
            }
        }
    }

    private void install(File apk) throws IOException {
        PackageInstaller installer = getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params =
                new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        params.setAppPackageName(getPackageName());
        int id = installer.createSession(params);
        try (PackageInstaller.Session session = installer.openSession(id)) {
            try (OutputStream out = session.openWrite("update", 0, apk.length());
                 InputStream in = new FileInputStream(apk)) {
                byte[] buf = new byte[65536];
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                }
                session.fsync(out);
            }
            Intent result = new Intent(this, MainActivity.class).setAction(ACTION_INSTALL);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= 31) {
                flags |= PendingIntent.FLAG_MUTABLE;
            }
            PendingIntent pending = PendingIntent.getActivity(this, id, result, flags);
            session.commit(pending.getIntentSender());
        }
        installMessage("Bestätige die Installation im Android-Dialog.");
    }

    private void handleInstallStatus(Intent intent) {
        if (intent == null || !ACTION_INSTALL.equals(intent.getAction())) {
            return;
        }
        Bundle extras = intent.getExtras();
        if (extras == null) {
            return;
        }
        int status = extras.getInt(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Object confirm = extras.get(Intent.EXTRA_INTENT);
            if (confirm instanceof Intent) {
                try {
                    startActivity((Intent) confirm);
                } catch (Exception e) {
                    installMessage("Der Installationsdialog liess sich nicht öffnen: " + e.getMessage());
                }
            }
        } else if (status != PackageInstaller.STATUS_SUCCESS) {
            String msg = extras.getString(PackageInstaller.EXTRA_STATUS_MESSAGE);
            installMessage("Installation nicht abgeschlossen" + (msg == null ? "." : ": " + msg));
        }
    }

    // ---------- Brücke für die Web-App ----------

    private final class Bridge {

        @JavascriptInterface
        public String ttsState() {
            return ttsState;
        }

        @JavascriptInterface
        public void speak(String text, float rate) {
            if (tts == null || !"ok".equals(ttsState) || text == null) {
                return;
            }
            tts.setSpeechRate(rate <= 0 ? 1f : rate);
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "kd");
        }

        @JavascriptInterface
        public void installTtsData() {
            runOnUiThread(() -> {
                try {
                    startActivity(new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA));
                } catch (Exception e) {
                    try {
                        startActivity(new Intent("com.android.settings.TTS_SETTINGS"));
                    } catch (Exception ignored) {
                    }
                }
            });
        }

        @JavascriptInterface
        public String version() {
            return BuildConfig.VERSION_NAME;
        }

        @JavascriptInterface
        public void copy(String text) {
            runOnUiThread(() -> {
                ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                if (cm != null) {
                    cm.setPrimaryClip(ClipData.newPlainText("Kana Dōjō", text));
                }
            });
        }

        @JavascriptInterface
        public void setBars(String hex, boolean dark) {
            runOnUiThread(() -> {
                try {
                    Window w = getWindow();
                    int color = Color.parseColor(hex);
                    w.setStatusBarColor(color);
                    w.setNavigationBarColor(color);
                    View decor = w.getDecorView();
                    int light = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    int flags = decor.getSystemUiVisibility();
                    decor.setSystemUiVisibility(dark ? (flags & ~light) : (flags | light));
                } catch (Exception ignored) {
                }
            });
        }

        @JavascriptInterface
        public void checkUpdate() {
            io.execute(MainActivity.this::checkUpdateNow);
        }

        @JavascriptInterface
        public void installUpdate(String url) {
            io.execute(() -> downloadAndInstall(url));
        }
    }
}
