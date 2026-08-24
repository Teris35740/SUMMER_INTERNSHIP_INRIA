"use client";

import { DynamicFactList } from "./dynamic-fact-list";
import { Stethoscope, Activity, AlertTriangle, History, Scissors } from "lucide-react";

export function StepAnamnesis() {
  return (
    <div className="space-y-8">
      {/* History */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-med-sky-subtle">
            <Stethoscope className="h-4 w-4 text-med-sky" />
          </div>
          <h3 className="text-lg font-semibold text-med-text-primary font-heading">
            Anamnèse
          </h3>
        </div>
        <DynamicFactList
          name="history"
          label="Histoire de la maladie"
          placeholder="Ex: La douleur est apparue il y a 3 heures en soulevant un sac..."
          minOne
        />
      </div>

      <div className="h-px bg-med-border-subtle" />

      {/* Vitals */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-med-emerald-subtle">
            <Activity className="h-4 w-4 text-med-emerald" />
          </div>
          <h3 className="text-lg font-semibold text-med-text-primary font-heading">
            Constantes vitales
          </h3>
        </div>
        <DynamicFactList
          name="vitals"
          label="Constantes"
          placeholder="Ex: Tension Artérielle : 135/85"
          minOne
        />
      </div>

      <div className="h-px bg-med-border-subtle" />

      {/* Risk Factors */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-med-amber-subtle">
            <AlertTriangle className="h-4 w-4 text-med-amber" />
          </div>
          <h3 className="text-lg font-semibold text-med-text-primary font-heading">
            Facteurs de risque
          </h3>
        </div>
        <DynamicFactList
          name="risk_factors"
          label="Facteurs de risque"
          placeholder="Ex: Obésité (IMC 35)..."
        />
      </div>

      <div className="h-px bg-med-border-subtle" />

      {/* Past Medical History */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-med-violet-subtle">
            <History className="h-4 w-4 text-med-violet" />
          </div>
          <h3 className="text-lg font-semibold text-med-text-primary font-heading">
            Antécédents médicaux
          </h3>
        </div>
        <DynamicFactList
          name="past_medical_history"
          label="Antécédents"
          placeholder="Ex: Diabète de type 2 (diagnostiqué il y a 3 ans)..."
        />
      </div>

      <div className="h-px bg-med-border-subtle" />

      {/* Surgical History */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-med-rose-subtle">
            <Scissors className="h-4 w-4 text-med-rose" />
          </div>
          <h3 className="text-lg font-semibold text-med-text-primary font-heading">
            Antécédents chirurgicaux
          </h3>
        </div>
        <DynamicFactList
          name="surgical_history"
          label="Chirurgies"
          placeholder="Ex: Appendicectomie à 15 ans..."
        />
      </div>
    </div>
  );
}
