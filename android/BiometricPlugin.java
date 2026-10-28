package com.gestione.app;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Plugin maison : déverrouillage administrateur par empreinte digitale ou
 * reconnaissance du visage (capteur du téléphone). Aucune empreinte n'est lue
 * ni stockée par l'application : Android répond seulement « reconnu » ou non.
 */
@CapacitorPlugin(name = "GbBiometric")
public class BiometricPlugin extends Plugin {
  private static final int AUTH = BiometricManager.Authenticators.BIOMETRIC_WEAK;

  @PluginMethod
  public void isAvailable(PluginCall call) {
    JSObject ret = new JSObject();
    try {
      int r = BiometricManager.from(getContext()).canAuthenticate(AUTH);
      ret.put("available", r == BiometricManager.BIOMETRIC_SUCCESS);
      ret.put("enrolled", r != BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED);
      ret.put("hardware", r != BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE && r != BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE);
    } catch (Exception e) {
      ret.put("available", false);
      ret.put("enrolled", false);
      ret.put("hardware", false);
    }
    call.resolve(ret);
  }

  @PluginMethod
  public void authenticate(PluginCall call) {
    final String title = call.getString("title", "Déverrouiller GestiOne");
    final String subtitle = call.getString("subtitle", "Posez votre doigt sur le capteur");
    final String cancel = call.getString("cancel", "Utiliser le code");
    if (!(getActivity() instanceof FragmentActivity)) { call.reject("Indisponible", "unavailable"); return; }
    final FragmentActivity activity = (FragmentActivity) getActivity();
    activity.runOnUiThread(() -> {
      try {
        BiometricPrompt prompt = new BiometricPrompt(activity, ContextCompat.getMainExecutor(activity), new BiometricPrompt.AuthenticationCallback() {
          @Override
          public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
            JSObject ret = new JSObject();
            ret.put("ok", true);
            call.resolve(ret);
          }

          @Override
          public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
            call.reject(String.valueOf(errString), String.valueOf(errorCode));
          }
        });
        BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
          .setTitle(title)
          .setSubtitle(subtitle)
          .setNegativeButtonText(cancel)
          .setAllowedAuthenticators(AUTH)
          .build();
        prompt.authenticate(info);
      } catch (Exception e) {
        call.reject("Indisponible", "unavailable");
      }
    });
  }
}
