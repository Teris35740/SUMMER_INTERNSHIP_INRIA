"use client";

import { useState } from "react";
import { Plus, Trash2, Pill, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PrescriptionMolecule } from "@/types/api";

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (molecules: PrescriptionMolecule[]) => void;
  isSubmitting: boolean;
}

export function PrescriptionModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: PrescriptionModalProps) {
  const [molecules, setMolecules] = useState<PrescriptionMolecule[]>([
    { name: "", dosage: "", route: "", duration: "" },
  ]);

  if (!isOpen) return null;

  const handleAddMolecule = () => {
    setMolecules([...molecules, { name: "", dosage: "", route: "", duration: "" }]);
  };

  const handleRemoveMolecule = (index: number) => {
    setMolecules(molecules.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof PrescriptionMolecule, value: string) => {
    const newMolecules = [...molecules];
    newMolecules[index][field] = value;
    setMolecules(newMolecules);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out completely empty rows
    const validMolecules = molecules.filter(
      (m) => m.name.trim() || m.dosage.trim() || m.route.trim() || m.duration.trim()
    );
    onSubmit(validMolecules);
  };

  const isFormEmpty = molecules.every(
    (m) => !m.name.trim() && !m.dosage.trim() && !m.route.trim() && !m.duration.trim()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-med-bg-elevated border border-med-border-default shadow-2xl rounded-2xl w-full max-w-3xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-med-border-default">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-med-sky-subtle text-med-sky rounded-xl">
              <Pill size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-med-text-primary">
                Rédiger l'ordonnance
              </h2>
              <p className="text-sm text-med-text-secondary mt-0.5">
                Prescrivez les traitements adaptés pour ce patient.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-med-text-muted hover:text-med-text-primary hover:bg-med-bg-surface-hover rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-med-bg-primary/30">
          <form id="prescription-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              {molecules.map((mol, index) => (
                <div
                  key={index}
                  className="p-5 rounded-2xl border border-med-border-default bg-med-bg-secondary shadow-sm relative group transition-all"
                >
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMolecule(index)}
                      className="h-8 w-8 text-med-text-muted hover:text-med-rose hover:bg-med-rose-subtle"
                      disabled={molecules.length === 1}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1 pr-8">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-med-text-secondary">Molécule (DCI ou Spécialité)</label>
                      <Input
                        placeholder="ex: Paracétamol"
                        value={mol.name}
                        onChange={(e) => handleChange(index, "name", e.target.value)}
                        required
                        className="bg-med-bg-primary border-med-border-default focus:bg-med-bg-elevated text-med-text-primary transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-med-text-secondary">Posologie</label>
                      <Input
                        placeholder="ex: 1g toutes les 8h"
                        value={mol.dosage}
                        onChange={(e) => handleChange(index, "dosage", e.target.value)}
                        required
                        className="bg-med-bg-primary border-med-border-default focus:bg-med-bg-elevated text-med-text-primary transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-med-text-secondary">Voie d'administration</label>
                      <Input
                        placeholder="ex: per os"
                        value={mol.route}
                        onChange={(e) => handleChange(index, "route", e.target.value)}
                        required
                        className="bg-med-bg-primary border-med-border-default focus:bg-med-bg-elevated text-med-text-primary transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-med-text-secondary">Durée</label>
                      <Input
                        placeholder="ex: 5 jours"
                        value={mol.duration}
                        onChange={(e) => handleChange(index, "duration", e.target.value)}
                        required
                        className="bg-med-bg-primary border-med-border-default focus:bg-med-bg-elevated text-med-text-primary transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleAddMolecule}
              className="w-full gap-2 border-dashed border-2 border-med-border-default hover:bg-med-bg-surface-hover text-med-text-primary"
            >
              <Plus size={16} />
              Ajouter un médicament
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-med-border-default bg-med-bg-primary/50 flex justify-end gap-3 rounded-b-2xl">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="text-med-text-secondary hover:bg-med-bg-surface-hover">
            Annuler
          </Button>
          <Button
            type="submit"
            form="prescription-form"
            disabled={isSubmitting || isFormEmpty}
            className="bg-med-sky hover:brightness-90 text-med-bg-primary gap-2 min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Évaluation...
              </>
            ) : (
              "Soumettre l'ordonnance"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
