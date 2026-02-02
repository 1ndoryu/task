package com.taskNakomi.app;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import com.google.android.gms.tasks.Task;

@CapacitorPlugin(name = "GoogleAuthNative")
public class GoogleAuthNativePlugin extends Plugin {

    private GoogleSignInClient googleSignInClient;

    @PluginMethod
    public void initialize(PluginCall call) {
        String serverClientId = call.getString("serverClientId", "84327954353-6vcogj4mjjg4c2kip5imvh3vqijqslck.apps.googleusercontent.com");
        
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestProfile()
                .requestServerAuthCode(serverClientId)
                .requestScopes(new Scope("profile"), new Scope("email"))
                .build();

        googleSignInClient = GoogleSignIn.getClient(getActivity(), gso);
        call.resolve();
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        if (googleSignInClient == null) {
            call.reject("Plugin not initialized. Call initialize() first.");
            return;
        }

        Intent signInIntent = googleSignInClient.getSignInIntent();
        startActivityForResult(call, signInIntent, "handleSignInResult");
    }

    @ActivityCallback
    private void handleSignInResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK) {
            Intent data = result.getData();
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                
                JSObject ret = new JSObject();
                ret.put("email", account.getEmail());
                ret.put("displayName", account.getDisplayName());
                ret.put("givenName", account.getGivenName());
                ret.put("familyName", account.getFamilyName());
                ret.put("photoUrl", account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : null);
                ret.put("id", account.getId());
                ret.put("serverAuthCode", account.getServerAuthCode());
                
                call.resolve(ret);
            } catch (ApiException e) {
                call.reject("Sign in failed: " + e.getStatusCode(), e);
            }
        } else {
            call.reject("Sign in cancelled");
        }
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        if (googleSignInClient != null) {
            googleSignInClient.signOut().addOnCompleteListener(task -> call.resolve());
        } else {
            call.resolve();
        }
    }
}
