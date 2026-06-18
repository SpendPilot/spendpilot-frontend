"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
} from "@azure/msal-browser";

import { readErrorMessage } from "@/lib/api";
import { buildApiUrl } from "@/lib/contracts";
import { getRuntimeConfig } from "@/lib/runtime-config";

type AuthProfile = {
  user: {
    id: string;
    email: string;
    display_name: string;
    platform_role: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    default_currency: string;
  };
  membership: {
    id: string;
    department_id?: string | null;
    onboarding_completed: boolean;
    role: string;
    status: string;
    department?: {
      id: string;
      name: string;
      description?: string | null;
    } | null;
  };
  session: {
    id: string;
    auth_provider: string;
    issued_at?: string | null;
    expires_at?: string | null;
  };
  effective_role: string;
};

type AuthShape = {
  authMode: "entra" | "dev-local";
  token: string | null;
  profile: AuthProfile | null;
  ready: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  devLogin: (profile?: { email?: string; display_name?: string; role?: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthShape | null>(null);
const DEV_TOKEN_KEY = "spend-control-dev-token";
const DEV_PROFILE_KEY = "spend-control-dev-profile";

let msalApp: PublicClientApplication | null = null;

function getMsalApp() {
  if (msalApp) return msalApp;

  const config = getRuntimeConfig();
  const clientId = config.entraFrontendClientId;
  const authority = config.entraAuthority;
  if (!clientId || !authority) {
    return null;
  }

  msalApp = new PublicClientApplication({
    auth: {
      clientId,
      authority,
      redirectUri: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
      postLogoutRedirectUri: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
    },
    cache: {
      cacheLocation: "sessionStorage",
    },
  });
  return msalApp;
}

async function fetchCurrentProfile(token: string) {
  const response = await fetch(buildApiUrl("/auth/me"), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Sign-in completed, but the profile could not be loaded."));
  }

  const payload = await response.json();
  return payload.data as AuthProfile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const runtimeConfig = getRuntimeConfig();
  const authMode = runtimeConfig.authMode;
  const apiScope =
    runtimeConfig.entraApiScope ||
    (runtimeConfig.entraBackendAudience ? `${runtimeConfig.entraBackendAudience}/access_as_user` : "");

  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function completeEntraSession(app: PublicClientApplication, account: AccountInfo) {
      const result: AuthenticationResult = await app.acquireTokenSilent({
        account,
        scopes: [apiScope],
      });
      const nextProfile = await fetchCurrentProfile(result.accessToken);
      if (!cancelled) {
        setToken(result.accessToken);
        setProfile(nextProfile);
      }
    }

    async function initialize() {
      if (authMode === "dev-local") {
        const storedToken = window.sessionStorage.getItem(DEV_TOKEN_KEY);
        const storedProfile = window.sessionStorage.getItem(DEV_PROFILE_KEY);
        if (storedToken) setToken(storedToken);
        if (storedProfile) setProfile(JSON.parse(storedProfile));
        setReady(true);
        return;
      }

      const app = getMsalApp();
      if (!app) {
        setError("MSAL is not configured. Set NEXT_PUBLIC_ENTRA_FRONTEND_CLIENT_ID and NEXT_PUBLIC_ENTRA_AUTHORITY.");
        setReady(true);
        return;
      }

      if (!apiScope) {
        setError("Missing NEXT_PUBLIC_ENTRA_API_SCOPE for backend token acquisition.");
        setReady(true);
        return;
      }

      try {
        await app.initialize();
        const redirectResult = await app.handleRedirectPromise();
        const cachedAccounts = app.getAllAccounts();
        const activeAccount =
          redirectResult?.account ||
          app.getActiveAccount() ||
          (cachedAccounts.length === 1 ? cachedAccounts[0] : null);
        if (activeAccount) {
          app.setActiveAccount(activeAccount);
          await completeEntraSession(app, activeAccount);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Authentication failed.");
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [apiScope, authMode]);

  const login = async () => {
    setError(null);
    if (authMode === "dev-local") {
      await devLogin();
      return;
    }

    const app = getMsalApp();
    if (!app || !apiScope) {
      setError("MSAL is not fully configured.");
      return;
    }

    await app.loginRedirect({
      authority: runtimeConfig.entraAuthority || "https://login.microsoftonline.com/common",
      scopes: [apiScope],
      prompt: "select_account",
    });
  };

  const devLogin = async (requestedProfile?: { email?: string; display_name?: string; role?: string }) => {
    const response = await fetch(buildApiUrl("/auth/dev-login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestedProfile ?? {}),
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Developer sign-in failed."));
    }

    const payload = await response.json();
    const authResponse = payload.data;
    setToken(authResponse.access_token);
    setProfile(authResponse.profile);
    window.sessionStorage.setItem(DEV_TOKEN_KEY, authResponse.access_token);
    window.sessionStorage.setItem(DEV_PROFILE_KEY, JSON.stringify(authResponse.profile));
  };

  const refreshProfile = async () => {
    if (!token) return;
    const nextProfile = await fetchCurrentProfile(token);
    setProfile(nextProfile);
    if (authMode === "dev-local") {
      window.sessionStorage.setItem(DEV_PROFILE_KEY, JSON.stringify(nextProfile));
    }
  };

  const logout = async () => {
    setToken(null);
    setProfile(null);
    setError(null);

    if (authMode === "dev-local") {
      window.sessionStorage.removeItem(DEV_TOKEN_KEY);
      window.sessionStorage.removeItem(DEV_PROFILE_KEY);
      return;
    }

    const app = getMsalApp();
    if (!app) return;
    await app.logoutRedirect();
  };

  return (
    <AuthContext.Provider
      value={{
        authMode,
        token,
        profile,
        ready,
        error,
        login,
        logout,
        devLogin,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
