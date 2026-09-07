"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  loginUser,
  registerUser,
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  getStoredUser,
  setStoredUser,
  removeStoredUser,
} from "@/lib/api";
import type { AuthUser, LoginRequest, RegisterRequest, UserRole } from "@/types/api";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isProfessor: boolean;
  isStudent: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (req: LoginRequest) => Promise<boolean>;
  register: (req: RegisterRequest) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Load user & token from localStorage on client mount
  useEffect(() => {
    try {
      const savedToken = getStoredToken();
      const savedUser = getStoredUser();
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(savedUser);
      }
    } catch (err) {
      console.error("Failed to load auth from storage:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const login = useCallback(async (req: LoginRequest): Promise<boolean> => {
    try {
      const response = await loginUser(req);
      const authUser: AuthUser = {
        email: req.email,
        full_name: response.full_name,
        role: response.role as UserRole,
      };

      setStoredToken(response.access_token);
      setStoredUser(authUser);

      setToken(response.access_token);
      setUser(authUser);
      setIsAuthModalOpen(false);

      toast.success(`Bienvenue, ${response.full_name} !`);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Identifiants invalides";
      toast.error(message);
      return false;
    }
  }, []);

  const register = useCallback(async (req: RegisterRequest): Promise<boolean> => {
    try {
      const response = await registerUser(req);
      const authUser: AuthUser = {
        email: req.email,
        full_name: response.full_name,
        role: response.role as UserRole,
      };

      setStoredToken(response.access_token);
      setStoredUser(authUser);

      setToken(response.access_token);
      setUser(authUser);
      setIsAuthModalOpen(false);

      toast.success(`Compte créé avec succès ! Bienvenue, ${response.full_name}.`);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'inscription";
      toast.error(message);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    removeStoredToken();
    removeStoredUser();
    setToken(null);
    setUser(null);
    toast.info("Vous avez été déconnecté.");
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    isProfessor: user?.role === "PROFESSOR",
    isStudent: user?.role === "STUDENT",
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
