"use client";

import Link from "next/link";
import { PatientForm } from "@/components/patient-form/patient-form";
import { ArrowLeft, UserPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NouveauPatientPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-med-bg-primary relative z-10">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 glass border-b border-med-border-subtle shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-med-text-secondary hover:text-med-text-primary border-med-border-default hover:bg-med-bg-surface-hover rounded-xl shadow-xs"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Retour aux cas</span>
                <span className="sm:hidden">Retour</span>
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-med-sky-subtle text-med-sky shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-med-text-primary font-heading leading-tight">
                Nouveau Patient Virtuel
              </h1>
              <p className="text-xs text-med-text-muted hidden sm:block">
                Créer et paramétrer un cas clinique pour MedSim
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-med-bg-secondary text-med-text-secondary font-medium hidden sm:inline-flex border border-med-border-subtle items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-med-sky" />
              Éditeur de cas
            </span>
          </div>
        </div>
      </header>

      {/* ── Form ── */}
      <main className="flex-1 px-4 sm:px-6 py-8 pb-20">
        <PatientForm />
      </main>
    </div>
  );
}
