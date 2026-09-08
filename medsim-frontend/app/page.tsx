"use client";

import { useState, useEffect } from "react";
import { useMedSim } from "@/hooks/use-medsim";
import { useAuth } from "@/context/auth-context";
import { ModeSelection } from "@/components/mode-selection";
import { AuthScreen } from "@/components/auth-screen";
import { Navbar } from "@/components/navbar";
import { ChatArea } from "@/components/chat/chat-area";
import { ClinicalSidebar } from "@/components/clinical-sidebar";
import { Activity, Stethoscope, PanelRightOpen } from "lucide-react";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const sim = useMedSim();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Keyboard shortcut: Cmd+B / Ctrl+B to toggle clinical sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-med-bg-primary">
        <div className="w-14 h-14 rounded-2xl bg-gradient-logo flex items-center justify-center text-white shadow-xl animate-pulse">
          <Activity className="w-7 h-7 animate-spin" strokeWidth={2.5} />
        </div>
        <p className="text-sm font-semibold text-med-text-secondary mt-4">
          Chargement de MedSim...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <>
      {sim.mode === null && (
        <ModeSelection onSelectMode={(mode) => sim.setMode(mode)} />
      )}

      {/* Full-height app shell */}
      <div className="flex w-full h-[100dvh] overflow-hidden bg-med-bg-primary">
        {/* Main Column: Navbar + ChatArea */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden transition-all duration-300">
          <Navbar
            groupedPatients={sim.groupedPatients}
            patients={sim.patients}
            currentPatientNum={sim.currentPatientNum}
            currentPatient={sim.currentPatient}
            mode={sim.mode}
            onSelectPatient={sim.selectPatient}
            onChangeMode={() => sim.setMode(null)}
            onDeletePatient={sim.removePatient}
          />

          <ChatArea
            mode={sim.mode}
            messages={sim.messages}
            isTyping={sim.isTyping}
            clinicalVignette={sim.clinicalVignette}
            status={sim.status}
            timeRemaining={sim.timeRemaining}
            timerActive={sim.timerActive}
            sessionExpired={sim.sessionExpired}
            prescriptionPhase={sim.prescriptionPhase}
            currentPatient={sim.currentPatient}
            onSend={sim.sendMessage}
            onClear={sim.clearSession}
          />

          {/* Floating trigger to re-open sidebar when collapsed on desktop */}
          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="hidden md:flex items-center gap-2 absolute top-4 right-5 z-40 px-3 py-2 rounded-xl bg-med-bg-elevated/95 backdrop-blur-xl border border-med-border-default text-xs font-bold text-med-text-primary hover:border-med-sky/50 hover:text-med-sky shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer animate-fade-in group"
              title="Afficher le dossier clinique (Cmd+B)"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-med-sky-subtle text-med-sky group-hover:scale-105 transition-transform">
                <Stethoscope size={13} />
              </div>
              <span>Dossier Clinique</span>
              <PanelRightOpen size={14} className="text-med-text-muted group-hover:text-med-sky" />
              {!sim.prescriptionPhase && !sim.sessionLocked && (
                <span className="w-2 h-2 rounded-full bg-med-amber animate-pulse" />
              )}
            </button>
          )}
        </div>

        {/* Right Sidebar: Full-height from top to bottom with collapse animation */}
        <ClinicalSidebar
          isOpen={sidebarOpen}
          onToggleOpen={() => setSidebarOpen((prev) => !prev)}
          status={sim.status}
          mode={sim.mode}
          sessionExpired={sim.sessionExpired}
          prescriptionPhase={sim.prescriptionPhase}
          diagnosisResult={sim.diagnosisResult}
          sessionLocked={sim.sessionLocked}
          currentPatient={sim.currentPatient}
          onSubmitDiagnosis={sim.diagnose}
          onSubmitPrescription={sim.prescribe}
        />
      </div>
    </>
  );
}
