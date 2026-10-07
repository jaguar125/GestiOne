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

// Envoie un fichier (PDF de facture) DIRECTEMENT dans la discussion WhatsApp
// d'un numéro précis, sans passer par le menu de partage ni chercher le contact.
// Essaie WhatsApp puis WhatsApp Business ; sinon renvoie une erreur et l'app
// retombe sur le menu de partage classique.
@CapacitorPlugin(name = "WhatsAppShare")
public class WhatsAppSharePlugin extends Plugin {

  @PluginMethod
  public void shareFile(PluginCall call) {
    String base64 = call.getString("base64");
    String fileName = call.getString("fileName", "document.pdf");
    String mime = call.getString("mimeType", "application/pdf");
    String phone = call.getString("phone", "");
    String text = call.getString("text", "");
    if (base64 == null || base64.isEmpty()) { call.reject("Fichier vide"); return; }
    String digits = phone == null ? "" : phone.replaceAll("[^0-9]", "");
    if (digits.isEmpty()) { call.reject("Numéro manquant"); return; }
    try {
      File dir = new File(getContext().getCacheDir(), "partage");
      if (!dir.exists()) dir.mkdirs();
      File file = new File(dir, fileName.replaceAll("[^A-Za-z0-9._-]", "_"));
      FileOutputStream out = new FileOutputStream(file);
      out.write(Base64.decode(base64, Base64.DEFAULT));
      out.close();
      Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
      String[] packages = { "com.whatsapp", "com.whatsapp.w4b" };
      for (String pkg : packages) {
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType(mime);
        intent.setPackage(pkg);
        intent.putExtra(Intent.EXTRA_STREAM, uri);
        if (text != null && !text.isEmpty()) intent.putExtra(Intent.EXTRA_TEXT, text);
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
}
