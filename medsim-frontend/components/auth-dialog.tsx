"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  GraduationCap,
  School,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import type { UserRole } from "@/types/api";

export function AuthDialog() {
  const { isAuthModalOpen, closeAuthModal, login, register } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerRole, setRegisterRole] = useState<UserRole>("STUDENT");

  const resetForms = () => {
    setLoginEmail("");
    setLoginPassword("");
    setRegisterFullName("");
    setRegisterEmail("");
    setRegisterPassword("");
    setRegisterRole("STUDENT");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeAuthModal();
      resetForms();
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) return;

    setIsSubmitting(true);
    try {
      const success = await login({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (success) {
        resetForms();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerFullName.trim() || !registerEmail.trim() || !registerPassword) return;

    setIsSubmitting(true);
    try {
      const success = await register({
        full_name: registerFullName.trim(),
        email: registerEmail.trim(),
        password: registerPassword,
        role: registerRole,
      });
      if (success) {
        resetForms();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="glass sm:max-w-[460px] border-med-border-default p-6 overflow-hidden">
        {/* Header */}
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-logo flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <DialogTitle className="text-xl font-bold text-med-text-primary font-heading">
            {activeTab === "login" ? "Connexion à MedSim" : "Créer un compte MedSim"}
          </DialogTitle>
          <DialogDescription className="text-xs text-med-text-secondary">
            {activeTab === "login"
              ? "Connectez-vous pour accéder à vos simulations et patients."
              : "Rejoignez la plateforme comme étudiant ou enseignant."}
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex bg-med-bg-surface p-1 rounded-xl border border-med-border-subtle mt-2 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "login"
                ? "bg-med-bg-elevated text-med-text-primary shadow-sm border border-med-border-default"
                : "text-med-text-secondary hover:text-med-text-primary"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Connexion
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "register"
                ? "bg-med-bg-elevated text-med-text-primary shadow-sm border border-med-border-default"
                : "text-med-text-secondary hover:text-med-text-primary"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Inscription
          </button>
        </div>

        {/* ── Tab 1: Login Form ── */}
        {activeTab === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-med-text-secondary flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Adresse email
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="nom@universite.fr"
                className="w-full px-3.5 py-2 rounded-lg bg-med-bg-surface border border-med-border-default
                           text-sm text-med-text-primary placeholder:text-med-text-muted
                           focus:outline-none focus:border-med-sky focus:ring-1 focus:ring-med-sky/30
                           transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-med-text-secondary flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-lg bg-med-bg-surface border border-med-border-default
                           text-sm text-med-text-primary placeholder:text-med-text-muted
                           focus:outline-none focus:border-med-sky focus:ring-1 focus:ring-med-sky/30
                           transition-colors"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !loginEmail.trim() || !loginPassword}
              className="w-full mt-2 py-2.5 bg-gradient-user-msg text-white font-semibold rounded-lg shadow-md hover:opacity-95 transition-opacity cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Se connecter
                </>
              )}
            </Button>
          </form>
        )}

        {/* ── Tab 2: Register Form ── */}
        {activeTab === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-med-text-secondary flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Nom complet
              </label>
              <input
                type="text"
                required
                value={registerFullName}
                onChange={(e) => setRegisterFullName(e.target.value)}
                placeholder="Ex: Dr. Martin ou Lucas Bernard"
                className="w-full px-3.5 py-2 rounded-lg bg-med-bg-surface border border-med-border-default
                           text-sm text-med-text-primary placeholder:text-med-text-muted
                           focus:outline-none focus:border-med-sky focus:ring-1 focus:ring-med-sky/30
                           transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-med-text-secondary flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Adresse email
              </label>
              <input
                type="email"
                required
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="etudiant@universite.fr"
                className="w-full px-3.5 py-2 rounded-lg bg-med-bg-surface border border-med-border-default
                           text-sm text-med-text-primary placeholder:text-med-text-muted
                           focus:outline-none focus:border-med-sky focus:ring-1 focus:ring-med-sky/30
                           transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-med-text-secondary flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder="Au moins 6 caractères"
                className="w-full px-3.5 py-2 rounded-lg bg-med-bg-surface border border-med-border-default
                           text-sm text-med-text-primary placeholder:text-med-text-muted
                           focus:outline-none focus:border-med-sky focus:ring-1 focus:ring-med-sky/30
                           transition-colors"
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-med-text-secondary">
                Sélectionnez votre rôle
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegisterRole("STUDENT")}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    registerRole === "STUDENT"
                      ? "bg-med-sky-subtle/50 border-med-sky text-med-text-primary ring-1 ring-med-sky"
                      : "bg-med-bg-surface border-med-border-default text-med-text-secondary hover:border-med-border-strong"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-med-sky">
                    <GraduationCap className="w-4 h-4" />
                    Étudiant
                  </div>
                  <span className="text-[0.65rem] text-med-text-muted">
                    Consultation & diagnostic
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegisterRole("PROFESSOR")}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    registerRole === "PROFESSOR"
                      ? "bg-med-emerald-subtle/50 border-med-emerald text-med-text-primary ring-1 ring-med-emerald"
                      : "bg-med-bg-surface border-med-border-default text-med-text-secondary hover:border-med-border-strong"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-med-emerald">
                    <School className="w-4 h-4" />
                    Professeur
                  </div>
                  <span className="text-[0.65rem] text-med-text-muted">
                    Gestion patients & documents
                  </span>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !registerFullName.trim() ||
                !registerEmail.trim() ||
                !registerPassword
              }
              className="w-full mt-3 py-2.5 bg-gradient-user-msg text-white font-semibold rounded-lg shadow-md hover:opacity-95 transition-opacity cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Créer mon compte
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
