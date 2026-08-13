"use client";

import Link from "next/link";
import { PatientForm } from "@/components/patient-form/patient-form";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NouveauPatientPage() {
  return (
    <div className="min-h-dvh bg-med-bg-primary relative z-10">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 glass border-b border-med-border-subtle">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-med-text-secondary hover:text-med-text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-user-msg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-med-text-primary font-heading">
                Nouveau Patient
              </h1>
              <p className="text-xs text-med-text-muted">
                Créer un cas clinique pour MedSim
              </p>
            </div>
          </div>

          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* ── Form ── */}
      <main className="px-4 sm:px-6 py-8 pb-16 overflow-y-auto" style={{ maxHeight: "calc(100dvh - 73px)" }}>
        <PatientForm />
      </main>
    </div>
  );
}
