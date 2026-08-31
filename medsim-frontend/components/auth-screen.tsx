"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  Activity,
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

export function AuthScreen() {
  const { login, register } = useAuth();

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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) return;

    setIsSubmitting(true);
    try {
      await login({
        email: loginEmail.trim(),
        password: loginPassword,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerFullName.trim() || !registerEmail.trim() || !registerPassword) return;

    setIsSubmitting(true);
    try {
      await register({
        full_name: registerFullName.trim(),
        email: registerEmail.trim(),
        password: registerPassword,
        role: registerRole,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-med-bg-primary/90 backdrop-blur-2xl px-4 py-8 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-md my-auto animate-card-scale-in">
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-logo flex items-center justify-center text-white shadow-lg mb-3.5">
            <Activity className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <h1
            className="text-3xl font-black tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <span className="text-gradient-brand">MedSim</span>
          </h1>
          <p className="text-med-text-secondary text-xs sm:text-sm mt-1.5 font-medium">
            Simulateur de consultation médicale avec RAG
          </p>
        </div>

        {/* Card Container */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-med-border-default shadow-2xl">
          {/* Tab Switcher */}
          <div className="flex bg-med-bg-surface p-1 rounded-xl border border-med-border-subtle mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "login"
                  ? "bg-med-bg-elevated text-med-text-primary shadow-sm border border-med-border-default"
                  : "text-med-text-secondary hover:text-med-text-primary"
              }`}
            >
              <LogIn className="w-4 h-4" />
              Connexion
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("register")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "register"
                  ? "bg-med-bg-elevated text-med-text-primary shadow-sm border border-med-border-default"
                  : "text-med-text-secondary hover:text-med-text-primary"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Inscription
            </button>
          </div>

          {/* ── Login Form ── */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-med-text-secondary flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Adresse email
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="nom@universite.fr"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-med-bg-surface border border-med-border-default
                             text-sm text-med-text-primary placeholder:text-med-text-muted
                             focus:outline-none focus:border-med-sky focus:ring-1 focus:ring-med-sky/30
                             transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-med-text-secondary flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Mot de passe
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-med-bg-surface border border-med-border-default
                             text-sm text-med-text-primary placeholder:text-med-text-muted
                             focus:outline-none focus:border-med-sky focus:ring-1 focus:ring-med-sky/30
                             transition-colors"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !loginEmail.trim() || !loginPassword}
                className="w-full mt-2 py-3 bg-gradient-user-msg text-white font-bold rounded-xl shadow-md hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
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

          {/* ── Register Form ── */}
          {activeTab === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-med-text-secondary flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Nom complet
                </label>
                <input
                  type="text"
                  required
                  value={registerFullName}
                  onChange={(e) => setRegisterFullName(e.target.value)}
                  placeholder="Ex: Dr. Martin ou Lucas Bernard"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-med-bg-surface border border-med-border-default
                             text-sm text-med-text-primary placeholder:text-med-text-muted
                             focus:outline-none focus:border-med-sky focus:ring-1 focus:ring-med-sky/30
                             transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-med-text-secondary flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Adresse email
                </label>
                <input
                  type="email"
                  required
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="etudiant@universite.fr"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-med-bg-surface border border-med-border-default
                             text-sm text-med-text-primary placeholder:text-med-text-muted
                             focus:outline-none focus:border-med-sky focus:ring-1 focus:ring-med-sky/30
                             transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-med-text-secondary flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Mot de passe
                </label>
                <input
                  type="password"
                  required
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="Au moins 6 caractères"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-med-bg-surface border border-med-border-default
                             text-sm text-med-text-primary placeholder:text-med-text-muted
                             focus:outline-none focus:border-med-sky focus:ring-1 focus:ring-med-sky/30
                             transition-colors"
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-med-text-secondary">
                  Sélectionnez votre rôle
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRegisterRole("STUDENT")}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      registerRole === "STUDENT"
                        ? "bg-med-sky-subtle/60 border-med-sky text-med-text-primary ring-2 ring-med-sky/40"
                        : "bg-med-bg-surface border-med-border-default text-med-text-secondary hover:border-med-border-strong"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-med-sky">
                      <GraduationCap className="w-4 h-4" />
                      Étudiant
                    </div>
                    <span className="text-[0.68rem] text-med-text-muted leading-tight">
                      Simulations & diagnostics
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegisterRole("PROFESSOR")}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      registerRole === "PROFESSOR"
                        ? "bg-med-emerald-subtle/60 border-med-emerald text-med-text-primary ring-2 ring-med-emerald/40"
                        : "bg-med-bg-surface border-med-border-default text-med-text-secondary hover:border-med-border-strong"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-med-emerald">
                      <School className="w-4 h-4" />
                      Professeur
                    </div>
                    <span className="text-[0.68rem] text-med-text-muted leading-tight">
                      Gestion patients & docs
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
                className="w-full mt-3 py-3 bg-gradient-user-msg text-white font-bold rounded-xl shadow-md hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
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
        </div>

        {/* Security badge note */}
        <div className="flex items-center justify-center gap-1.5 mt-5 text-[0.7rem] text-med-text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-med-emerald" />
          <span>Accès sécurisé par jeton JWT & hachage cryptographique</span>
        </div>
      </div>
    </div>
  );
}
