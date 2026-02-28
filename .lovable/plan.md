

## Problem

On `locusfood.by` (custom domain), Google OAuth for **new users** fails — they get redirected to the homepage without account creation. Existing users work fine. This is caused by Lovable's auth-bridge intercepting the OAuth redirect flow on custom domains.

## Root Cause

Lines 384-389 in `Auth.tsx` use the standard `signInWithOAuth` flow. On custom domains (not `*.lovable.app`), the auth-bridge incorrectly handles the redirect, breaking new user registration.

## Fix

Modify the Google sign-in button handler (lines 382-394) to:

1. Detect if running on a custom domain (not `*.lovable.app` / `*.lovableproject.com`)
2. If custom domain: use `skipBrowserRedirect: true` to get the OAuth URL directly, then redirect manually via `window.location.href`
3. If Lovable domain: keep current behavior

### Code Change (Auth.tsx, ~line 382-394)

Replace the `onClick` handler with:

```typescript
onClick={async () => {
  setIsLoading(true);
  const isCustomDomain =
    !window.location.hostname.includes("lovable.app") &&
    !window.location.hostname.includes("lovableproject.com");

  if (isCustomDomain) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth',
        skipBrowserRedirect: true,
      },
    });
    if (error) {
      toast.error("Ошибка входа через Google: " + error.message);
      setIsLoading(false);
      return;
    }
    if (data?.url) {
      const oauthUrl = new URL(data.url);
      if (oauthUrl.hostname !== "accounts.google.com" &&
          !oauthUrl.hostname.endsWith(".supabase.co")) {
        toast.error("Invalid OAuth redirect URL");
        setIsLoading(false);
        return;
      }
      window.location.href = data.url;
    }
  } else {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth',
      },
    });
    if (error) {
      toast.error("Ошибка входа через Google: " + error.message);
      setIsLoading(false);
    }
  }
}}
```

### Supabase Dashboard Configuration Required

The user must verify these settings in **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL**: `https://locusfood.by`
- **Redirect URLs**: must include `https://locusfood.by/auth`

