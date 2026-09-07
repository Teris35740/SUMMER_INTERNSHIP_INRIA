"use client";

import { useState } from "react";
import { useMedSim } from "@/hooks/use-medsim";
import { useAuth } from "@/context/auth-context";
import { ModeSelection } from "@/components/mode-selection";
import { AuthScreen } from "@/components/auth-screen";
import { Navbar } from "@/components/navbar";
import { ChatArea } from "@/components/chat/chat-area";
import { DiagnosisModal } from "@/components/diagnosis-modal";
import { PrescriptionModal } from "@/components/chat/prescription-modal";
import { Activity } from "lucide-react";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const sim = useMedSim();
  const [diagnosisModalOpen, setDiagnosisModalOpen] = useState(false);
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);

  // Splash loading screen while checking stored credentials
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

  // Authentication Gate: must login or register first
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <>
      {/* Mode Selection Overlay */}
      {sim.mode === null && (
        <ModeSelection
          onSelectMode={(mode) => sim.setMode(mode)}
        />
      )}

      {/* Floating Navbar */}
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

      {/* Main layout */}
      <div
        className="flex relative w-full h-[calc(100dvh-var(--navbar-height))] mt-[var(--navbar-height)]"
      >
        {/* Chat Area */}
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
          onSend={sim.sendMessage}
          onDiagnose={() => setDiagnosisModalOpen(true)}
          onOpenPrescription={() => setPrescriptionModalOpen(true)}
          onClear={sim.clearSession}
        />
      </div>

      {/* Diagnosis Modal */}
      <DiagnosisModal
        open={diagnosisModalOpen}
        onOpenChange={setDiagnosisModalOpen}
        onSubmit={sim.diagnose}
      />

      {/* Prescription Modal */}
      <PrescriptionModal
        isOpen={prescriptionModalOpen}
        onClose={() => setPrescriptionModalOpen(false)}
        onSubmit={(molecules) => {
          sim.prescribe(molecules);
          setPrescriptionModalOpen(false);
        }}
        isSubmitting={sim.status === "busy"}
      />
    </>
  );
}
