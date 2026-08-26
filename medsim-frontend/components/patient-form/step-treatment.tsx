"use client";

import { useEffect } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PatientFormData } from "@/lib/schemas/patient-form-schema";

export function StepTreatment() {
  const { control, register, formState: { errors } } = useFormContext<PatientFormData>();
  const treatmentErrors = errors.metadata?.expected_treatment as any;

  const {
    fields: moleculeFields,
    append: appendMolecule,
    remove: removeMolecule,
  } = useFieldArray({
    control,
    name: "metadata.expected_treatment.molecules" as any,
  });

  const {
    fields: ciFields,
    append: appendCI,
    remove: removeCI,
  } = useFieldArray({
    control,
    name: "metadata.expected_treatment.contraindications_to_check" as any,
  });

  useEffect(() => {
    if (moleculeFields.length === 0) {
      appendMolecule({ name: "", dosage: "", route: "", duration: "" });
    }
  }, [moleculeFields.length, appendMolecule]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-med-border-default pb-4">
        <div className="p-2.5 bg-med-amber-subtle text-med-amber rounded-xl">
          <Pill className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-med-text-primary font-heading">
            Traitement attendu
          </h2>
          <p className="text-sm text-med-text-secondary">
            Définissez la prescription que l'étudiant devra proposer.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Molécules */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-med-text-primary">Molécules prescrites</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendMolecule({ name: "", dosage: "", route: "", duration: "" })}
              className="h-8 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter une molécule
            </Button>
          </div>
          
          {treatmentErrors?.molecules?.message && (
            <p className="text-sm font-medium text-med-rose">
              {treatmentErrors.molecules.message}
            </p>
          )}
          
          <div className="space-y-4">
            {moleculeFields.map((field, index) => {
              const molErrors = treatmentErrors?.molecules?.[index];
              return (
                <div key={field.id} className={`p-4 rounded-xl border ${molErrors ? 'border-med-rose/50 bg-med-rose-subtle/20' : 'border-med-border-subtle bg-med-bg-surface-hover/50'} space-y-4 relative group`}>
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMolecule(index)}
                      className="h-7 w-7 text-med-text-muted hover:text-med-rose hover:bg-med-rose-subtle"
                      disabled={moleculeFields.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className={molErrors?.name ? "text-med-rose" : ""}>Nom (DCI ou Spécialité)</Label>
                      <Input placeholder="ex: Paracétamol" {...register(`metadata.expected_treatment.molecules.${index}.name` as any)} className={molErrors?.name ? "border-med-rose/50 focus-visible:ring-med-rose/30" : ""} />
                      {molErrors?.name && <p className="text-xs font-medium text-med-rose">{molErrors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className={molErrors?.dosage ? "text-med-rose" : ""}>Posologie</Label>
                      <Input placeholder="ex: 1g x3/j" {...register(`metadata.expected_treatment.molecules.${index}.dosage` as any)} className={molErrors?.dosage ? "border-med-rose/50 focus-visible:ring-med-rose/30" : ""} />
                      {molErrors?.dosage && <p className="text-xs font-medium text-med-rose">{molErrors.dosage.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className={molErrors?.route ? "text-med-rose" : ""}>Voie d'administration</Label>
                      <Input placeholder="ex: orale" {...register(`metadata.expected_treatment.molecules.${index}.route` as any)} className={molErrors?.route ? "border-med-rose/50 focus-visible:ring-med-rose/30" : ""} />
                      {molErrors?.route && <p className="text-xs font-medium text-med-rose">{molErrors.route.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className={molErrors?.duration ? "text-med-rose" : ""}>Durée</Label>
                      <Input placeholder="ex: 5 jours" {...register(`metadata.expected_treatment.molecules.${index}.duration` as any)} className={molErrors?.duration ? "border-med-rose/50 focus-visible:ring-med-rose/30" : ""} />
                      {molErrors?.duration && <p className="text-xs font-medium text-med-rose">{molErrors.duration.message}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contre-indications */}
        <div className="space-y-4 pt-4 border-t border-med-border-default/50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-med-text-primary">Contre-indications à vérifier</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendCI("")}
              className="h-8 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </Button>
          </div>
          
          <div className="space-y-3">
            {ciFields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <div className="flex-1">
                  <Input placeholder="ex: Allergie aux AINS, Insuffisance rénale" {...register(`metadata.expected_treatment.contraindications_to_check.${index}` as any)} />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCI(index)}
                  className="shrink-0 text-med-text-muted hover:text-med-rose hover:bg-med-rose-subtle"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {ciFields.length === 0 && (
              <p className="text-sm text-med-text-muted italic">Aucune contre-indication spécifiée.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
