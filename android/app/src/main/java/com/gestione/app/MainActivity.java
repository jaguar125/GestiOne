package com.gestione.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  // Taille du texte figée à 100 % : sans ça, la « taille de police » réglée
  // dans les paramètres du téléphone agrandit tout le texte de l'application
  // et les libellés débordent des boutons (mise en page conçue à 100 %).
  private void fixTextZoom() {
    try {
      if (getBridge() == null) return;
      WebView wv = getBridge().getWebView();
      if (wv != null) wv.getSettings().setTextZoom(100);
    } catch (Exception ignored) { }
  }

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    fixTextZoom();
  }

  @Override
  public void onResume() {
    super.onResume();
    fixTextZoom();
  }
}
