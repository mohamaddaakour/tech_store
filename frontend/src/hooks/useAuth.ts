import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { login, logout, refreshSession, register } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => setSession(data.accessToken, data.user),
  });
}

export function useRegister() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: register,
    onSuccess: (data) => setSession(data.accessToken, data.user),
  });
}

export function useLogout() {
  const clearSession = useAuthStore((state) => state.clearSession);
  const clearCart = useCartStore((state) => state.clear);

  return useMutation({
    mutationFn: logout,

    onSettled: () => {
      clearSession();
      clearCart();
    },
  });
}

export function useRestoreSession() {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  const hasAttempted = useRef(false);

  useEffect(() => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    refreshSession()
      .then((data) => setSession(data.accessToken, data.user))

      .catch(() => clearSession());
  }, [setSession, clearSession]);
}
