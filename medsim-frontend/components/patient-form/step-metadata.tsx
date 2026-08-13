"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Target, BookOpen, AlertTriangle, Plus, X } from "lucide-react";
import { SPECIALTY_OPTIONS } from "@/lib/schemas/patient-form-schema";
import type { PatientFormData } from "@/lib/schemas/patient-form-schema";

export function StepMetadata() {
  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<PatientFormData>();

  const altDiagnoses = useFieldArray({
    control,
    name: "metadata.alternative_diagnoses" as never,
  });

  const redFlags = useFieldArray({
    control,
    name: "metadata.red_flags" as never,
  });

  return (
    <div className="space-y-8">
      {/* ── Diagnostic ── */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-med-emerald-subtle">
            <Target className="h-4 w-4 text-med-emerald" />
          </div>
          <h3 className="text-lg font-semibold text-med-text-primary font-heading">
            Diagnostic
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Difficulty */}
          <div className="space-y-2">
            <Label>
              Difficulté <span className="text-med-rose">*</span>
            </Label>
            <Select
              value={watch("metadata.difficulty") || ""}
              onValueChange={(val: string | null) => {
                if (val != null) {
                  setValue("metadata.difficulty", val as "easy" | "medium" | "hard", {
                    shouldValidate: true,
                  });
                }
              }}
            >
              <SelectTrigger className="bg-med-bg-primary/50 border-med-border-default">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-med-emerald" />
                    Facile
                  </span>
                </SelectItem>
                <SelectItem value="medium">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-med-amber" />
                    Moyen
                  </span>
                </SelectItem>
                <SelectItem value="hard">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-med-rose" />
                    Difficile
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.metadata?.difficulty && (
              <p className="text-xs text-med-rose">{errors.metadata.difficulty.message}</p>
            )}
          </div>

          {/* Specialty */}
          <div className="space-y-2">
            <Label>
              Spécialité <span className="text-med-rose">*</span>
            </Label>
            <Select
              value={watch("metadata.specialty") || ""}
              onValueChange={(val: string | null) => {
                if (val != null) {
                  setValue("metadata.specialty", val, { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger className="bg-med-bg-primary/50 border-med-border-default">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {SPECIALTY_OPTIONS.map((sp) => (
                  <SelectItem key={sp} value={sp}>
                    {sp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.metadata?.specialty && (
              <p className="text-xs text-med-rose">{errors.metadata.specialty.message}</p>
            )}
          </div>
        </div>

        {/* Expected Diagnosis */}
        <div className="space-y-2">
          <Label htmlFor="metadata.expected_diagnosis">
            Diagnostic attendu <span className="text-med-rose">*</span>
          </Label>
          <Input
            id="metadata.expected_diagnosis"
            {...register("metadata.expected_diagnosis")}
            placeholder="Ex: Lombalgie aiguë mécanique"
            className="bg-med-bg-primary/50 border-med-border-default focus:border-med-border-focus"
          />
          {errors.metadata?.expected_diagnosis && (
            <p className="text-xs text-med-rose">
              {errors.metadata.expected_diagnosis.message}
            </p>
          )}
        </div>
      </div>

      <div className="h-px bg-med-border-subtle" />

      {/* ── Diagnostics alternatifs ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-med-amber-subtle">
            <BookOpen className="h-4 w-4 text-med-amber" />
          </div>
          <h3 className="text-lg font-semibold text-med-text-primary font-heading">
            Diagnostics alternatifs
          </h3>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-med-text-muted">
            Les diagnostics que l&apos;étudiant pourrait envisager.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => altDiagnoses.append("" as never)}
            className="gap-1.5 text-med-sky border-med-border-default hover:bg-med-sky-subtle"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>

        {errors.metadata?.alternative_diagnoses &&
          "message" in errors.metadata.alternative_diagnoses && (
            <p className="text-sm text-med-rose">
              {errors.metadata.alternative_diagnoses.message}
            </p>
          )}

        <div className="space-y-2">
          {altDiagnoses.fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2 animate-card-scale-in">
              <Input
                {...register(`metadata.alternative_diagnoses.${index}` as const)}
                placeholder={`Diagnostic alternatif ${index + 1}`}
                className="bg-med-bg-primary/50 border-med-border-default"
              />
              <button
                type="button"
                onClick={() => altDiagnoses.remove(index)}
                className="p-2 rounded-lg text-med-text-muted hover:text-med-rose hover:bg-med-rose-subtle transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-med-border-subtle" />

      {/* ── Drapeaux rouges ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-med-red-subtle">
            <AlertTriangle className="h-4 w-4 text-med-red" />
          </div>
          <h3 className="text-lg font-semibold text-med-text-primary font-heading">
            Drapeaux rouges (Red Flags)
          </h3>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-med-text-muted">
            Signes d&apos;alerte que l&apos;étudiant doit identifier.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => redFlags.append("" as never)}
            className="gap-1.5 text-med-sky border-med-border-default hover:bg-med-sky-subtle"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>

        {errors.metadata?.red_flags &&
          "message" in errors.metadata.red_flags && (
            <p className="text-sm text-med-rose">
              {errors.metadata.red_flags.message}
            </p>
          )}

        <div className="space-y-2">
          {redFlags.fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2 animate-card-scale-in">
              <Input
                {...register(`metadata.red_flags.${index}` as const)}
                placeholder={`Drapeau rouge ${index + 1}`}
                className="bg-med-bg-primary/50 border-med-border-default"
              />
              <button
                type="button"
                onClick={() => redFlags.remove(index)}
                className="p-2 rounded-lg text-med-text-muted hover:text-med-rose hover:bg-med-rose-subtle transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
