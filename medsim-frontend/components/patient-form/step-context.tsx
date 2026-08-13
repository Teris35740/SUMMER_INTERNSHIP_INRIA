"use client";

import { DynamicFactList } from "./dynamic-fact-list";
import { Users, Plane, Briefcase, Pill, ShieldAlert } from "lucide-react";

export function StepContext() {
  return (
    <div className="space-y-8">
      {/* Family History */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-med-violet-subtle">
            <Users className="h-4 w-4 text-med-violet" />
          </div>
          <h3 className="text-lg font-semibold text-med-text-primary font-heading">
            Antécédents familiaux
          </h3>
        </div>
        <DynamicFactList
          name="family_history"
          label="Famille"
          placeholder="Ex: Mère : Diabétique de type 2..."
        />
      </div>

      <div className="h-px bg-med-border-subtle" />

      {/* Travel History */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-med-teal-subtle">
            <Plane className="h-4 w-4 text-med-teal" />
          </div>
          <h3 className="text-lg font-semibold text-med-text-primary font-heading">
            Historique de voyages
          </h3>
        </div>
        <DynamicFactList
          name="travel_history"
          label="Voyages"
          placeholder="Ex: Séjour en Afrique subsaharienne il y a 3 mois..."
        />
      </div>

      <div className="h-px bg-med-border-subtle" />

      {/* Social History */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-med-sky-subtle">
            <Briefcase className="h-4 w-4 text-med-sky" />
          </div>
          <h3 className="text-lg font-semibold text-med-text-primary font-heading">
            Contexte social
          </h3>
        </div>
        <DynamicFactList
          name="social_history"
          label="Social"
          placeholder="Ex: Profession : Ouvrier maçon, travail physique..."
        />
      </div>

      <div className="h-px bg-med-border-subtle" />

      {/* Treatments */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-med-emerald-subtle">
            <Pill className="h-4 w-4 text-med-emerald" />
          </div>
          <h3 className="text-lg font-semibold text-med-text-primary font-heading">
            Traitements en cours
          </h3>
        </div>
        <DynamicFactList
          name="treatments"
          label="Traitements"
          placeholder="Ex: Metformine 500 mg (1 matin, 1 soir)..."
        />
      </div>

      <div className="h-px bg-med-border-subtle" />

      {/* Allergies */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-med-rose-subtle">
            <ShieldAlert className="h-4 w-4 text-med-rose" />
          </div>
          <h3 className="text-lg font-semibold text-med-text-primary font-heading">
            Allergies
          </h3>
        </div>
        <DynamicFactList
          name="allergies"
          label="Allergies"
          placeholder="Ex: Allergie aux pollens et à l'arachide..."
        />
      </div>
    </div>
  );
}
