package com.gestione.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;

// Envoi WhatsApp DIRECT vers un numéro précis (sans menu de partage ni
// recherche du contact) :
//  - shareFile : photo d'article ou PDF de facture + message, dans la
//    discussion du numéro (il ne reste qu'à appuyer sur « Envoyer »).
//  - openChat  : ouvre la discussion du numéro avec le message pré-rempli.
// Essaie WhatsApp puis WhatsApp Business.
@CapacitorPlugin(name = "WhatsAppShare")
public class WhatsAppSharePlugin extends Plugin {

  private static final String[] PACKAGES = { "com.whatsapp", "com.whatsapp.w4b" };

  private static String digitsOf(String phone) {
    return phone == null ? "" : phone.replaceAll("[^0-9]", "");
  }

  @PluginMethod
  public void shareFile(PluginCall call) {
    String base64 = call.getString("base64");
    String fileName = call.getString("fileName", "document.pdf");
    String mime = call.getString("mimeType", "application/pdf");
    String text = call.getString("text", "");
    String digits = digitsOf(call.getString("phone", ""));
    if (base64 == null || base64.isEmpty()) { call.reject("Fichier vide"); return; }
    if (digits.isEmpty()) { call.reject("Numéro manquant"); return; }
    try {
      File dir = new File(getContext().getCacheDir(), "partage");
      if (!dir.exists()) dir.mkdirs();
      File file = new File(dir, fileName.replaceAll("[^A-Za-z0-9._-]", "_"));
      FileOutputStream out = new FileOutputStream(file);
      out.write(Base64.decode(base64, Base64.DEFAULT));
      out.close();
      Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
      for (String pkg : PACKAGES) {
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType(mime);
        intent.setPackage(pkg);
        intent.putExtra(Intent.EXTRA_STREAM, uri);
        if (text != null && !text.isEmpty()) intent.putExtra(Intent.EXTRA_TEXT, text);
        // "jid" = identifiant WhatsApp du destinataire : WhatsApp ouvre
        // directement sa discussion au lieu de la liste des contacts.
        intent.putExtra("jid", digits + "@s.whatsapp.net");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
          getContext().grantUriPermission(pkg, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
          getContext().startActivity(intent);
          JSObject ret = new JSObject();
          ret.put("app", pkg);
          call.resolve(ret);
          return;
        } catch (ActivityNotFoundException e) {
          // essai suivant (WhatsApp Business)
        }
      }
      call.reject("WhatsApp n'est pas installé");
    } catch (Exception e) {
      call.reject("Envoi impossible : " + e.getMessage());
    }
  }

  @PluginMethod
  public void openChat(PluginCall call) {
    String text = call.getString("text", "");
    String digits = digitsOf(call.getString("phone", ""));
    if (digits.isEmpty()) { call.reject("Numéro manquant"); return; }
    String url = "https://api.whatsapp.com/send?phone=" + digits
        + (text != null && !text.isEmpty() ? "&text=" + Uri.encode(text) : "");
    for (String pkg : PACKAGES) {
      Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
      intent.setPackage(pkg);
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      try {
        getContext().startActivity(intent);
        JSObject ret = new JSObject();
        ret.put("app", pkg);
        call.resolve(ret);
        return;
      } catch (ActivityNotFoundException e) {
        // essai suivant
      }
    }
    try {
      Intent web = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
      web.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getContext().startActivity(web);
      JSObject ret = new JSObject();
      ret.put("app", "web");
      call.resolve(ret);
    } catch (Exception e) {
      call.reject("WhatsApp n'est pas installé");
    }
  }
}
