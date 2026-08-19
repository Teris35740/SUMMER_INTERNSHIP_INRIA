"use client";

import { useState } from "react";
import { useMedSim } from "@/hooks/use-medsim";
import { ModeSelection } from "@/components/mode-selection";
import { Navbar } from "@/components/navbar";
import { ChatArea } from "@/components/chat/chat-area";
import { PipelinePanel } from "@/components/pipeline/pipeline-panel";
import { DiagnosisModal } from "@/components/diagnosis-modal";

export default function Home() {
  const sim = useMedSim();
  const [diagnosisModalOpen, setDiagnosisModalOpen] = useState(false);

  return (
    <>
      {/* Mode Selection Overlay */}
      {sim.mode === null && (
        <ModeSelection
          onSelectMode={(mode) => sim.setMode(mode)}
        />
      )}

      {/* Navbar */}
      <Navbar
        groupedPatients={sim.groupedPatients}
        patients={sim.patients}
        currentPatientNum={sim.currentPatientNum}
        currentPatient={sim.currentPatient}
        status={sim.status}
        mode={sim.mode}
        isPipelineOpen={sim.isPipelineOpen}
        onSelectPatient={sim.selectPatient}
        onTogglePipeline={sim.togglePipeline}
        onChangeMode={() => sim.setMode(null)}
        onDeletePatient={sim.removePatient}
      />

      {/* Main layout */}
      <div
        className="flex relative"
        style={{
          height: "calc(100dvh - var(--navbar-height))",
          marginTop: "var(--navbar-height)",
        }}
      >
        {/* Chat Area */}
        <ChatArea
          messages={sim.messages}
          isTyping={sim.isTyping}
          clinicalVignette={sim.clinicalVignette}
          status={sim.status}
          timeRemaining={sim.timeRemaining}
          timerActive={sim.timerActive}
          sessionExpired={sim.sessionExpired}
          isPipelineOpen={sim.isPipelineOpen}
          onSend={sim.sendMessage}
          onDiagnose={() => setDiagnosisModalOpen(true)}
          onClear={sim.clearSession}
        />

        {/* Pipeline Panel */}
        <PipelinePanel
          isOpen={sim.isPipelineOpen}
          status={sim.status}
          data={sim.pipelineData}
          onClose={() => sim.setIsPipelineOpen(false)}
        />
      </div>

      {/* Diagnosis Modal */}
      <DiagnosisModal
        open={diagnosisModalOpen}
        onOpenChange={setDiagnosisModalOpen}
        onSubmit={sim.diagnose}
      />
    </>
  );
}

