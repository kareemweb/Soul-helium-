import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { OperationType, auth, db, googleProvider, handleFirestoreError } from "../lib/firebase";
import { DEFAULT_SETTINGS } from "../lib/models";
import { sanitizeDisplayName, sanitizeSystemPrompt } from "../lib/chatUtils";
import type { Settings } from "../lib/types";

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  signingIn: boolean;
  authError: string | null;
  profileSettings: Settings | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  saveUserProfileSettings: (s: Settings) => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [profileSettings, setProfileSettings] = useState<Settings | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfileSettings(null);
        setAuthReady(true);
        return;
      }

      const path = `users/${nextUser.uid}`;
      try {
        const ref = doc(db, "users", nextUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as Partial<Settings>;
          setProfileSettings({
            displayName: sanitizeDisplayName(data.displayName || nextUser.displayName),
            systemPrompt: sanitizeSystemPrompt(data.systemPrompt, DEFAULT_SETTINGS.systemPrompt),
          });
        } else {
          const displayName = sanitizeDisplayName(nextUser.displayName || nextUser.email?.split("@")[0]);
          const initial: Record<string, unknown> = {
            uid: nextUser.uid,
            displayName,
            systemPrompt: DEFAULT_SETTINGS.systemPrompt,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (typeof nextUser.email === "string" && nextUser.email.length > 0) {
            initial.email = nextUser.email.slice(0, 254);
          }
          if (typeof nextUser.photoURL === "string" && nextUser.photoURL.length > 0) {
            initial.photoURL = nextUser.photoURL.slice(0, 1024);
          }
          await setDoc(ref, initial);
          setProfileSettings({
            displayName,
            systemPrompt: DEFAULT_SETTINGS.systemPrompt,
          });
        }
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.GET, path);
        } catch (wrapped) {
          setAuthError(wrapped instanceof Error ? wrapped.message : "Failed to load user profile.");
        }
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // user dismissed popup cleanly
      } else if (code === "auth/popup-blocked") {
        setAuthError("Sign-in popup was blocked by your browser. Please allow popups and try again.");
      } else {
        setAuthError(err instanceof Error ? err.message : "Google Sign-In failed.");
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to sign out.");
    }
  }, []);

  const saveUserProfileSettings = useCallback(
    async (s: Settings) => {
      if (!user) return;
      const sanitized: Settings = {
        displayName: sanitizeDisplayName(s.displayName),
        systemPrompt: sanitizeSystemPrompt(s.systemPrompt, DEFAULT_SETTINGS.systemPrompt),
      };
      setProfileSettings(sanitized);
      const path = `users/${user.uid}`;
      try {
        const ref = doc(db, "users", user.uid);
        await updateDoc(ref, {
          displayName: sanitized.displayName,
          systemPrompt: sanitized.systemPrompt,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user],
  );

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        signingIn,
        authError,
        profileSettings,
        signInWithGoogle,
        signOutUser,
        saveUserProfileSettings,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
