"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { REVEAL_POLICY_OPTIONS } from "@/lib/schemas/patient-form-schema";
import type { PatientFormData } from "@/lib/schemas/patient-form-schema";

type ArrayFieldName = Exclude<
  keyof PatientFormData,
  "identity" | "chief_complaint" | "metadata"
>;

interface DynamicFactListProps {
  /** Field name in the form (e.g. "history", "vitals") */
  name: ArrayFieldName;
  /** Display label */
  label: string;
  /** Placeholder for the information textarea */
  placeholder?: string;
  /** If true, cannot remove the last item */
  minOne?: boolean;
}

export function DynamicFactList({
  name,
  label,
  placeholder = "Décrivez l'information médicale...",
  minOne = false,
}: DynamicFactListProps) {
  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<PatientFormData>();

  const { fields, append, remove } = useFieldArray({ control, name });

  const sectionErrors = errors[name];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold text-med-text-primary">
          {label}
          {minOne && <span className="text-med-rose ml-1">*</span>}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({ information: "", reveal_policy: "direct_if_asked" })
          }
          className="gap-1.5 text-med-sky border-med-border-default hover:bg-med-sky-subtle hover:text-med-sky-hover transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </Button>
      </div>

      {/* Error at array level */}
      {sectionErrors && "message" in sectionErrors && (
        <p className="text-sm text-med-rose">{sectionErrors.message as string}</p>
      )}

      {/* Empty state */}
      {fields.length === 0 && (
        <div className="rounded-xl border border-dashed border-med-border-default p-6 text-center">
          <p className="text-sm text-med-text-muted">
            Aucun élément. Cliquez sur « Ajouter » pour commencer.
          </p>
        </div>
      )}

      {/* Items */}
      <div className="space-y-3">
        {fields.map((field, index) => {
          const fieldErrors = Array.isArray(sectionErrors)
            ? sectionErrors[index]
            : undefined;

          return (
            <div
              key={field.id}
              className="group relative rounded-xl border border-med-border-default bg-med-bg-surface/50 p-4 transition-all hover:border-med-border-strong hover:shadow-sm animate-card-scale-in"
            >
              {/* Index badge */}
              <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-med-sky text-med-text-inverse">
                #{index + 1}
              </div>

              {/* Remove button */}
              {(!minOne || fields.length > 1) && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-med-text-muted hover:text-med-rose hover:bg-med-rose-subtle transition-colors opacity-0 group-hover:opacity-100"
                  aria-label={`Supprimer ${label} #${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              <div className="space-y-3 mt-1">
                {/* Information */}
                <div>
                  <Label
                    htmlFor={`${name}.${index}.information`}
                    className="text-sm text-med-text-secondary mb-1.5"
                  >
                    Information
                  </Label>
                  <Textarea
                    id={`${name}.${index}.information`}
                    {...register(`${name}.${index}.information` as const)}
                    placeholder={placeholder}
                    className="min-h-[72px] resize-y bg-med-bg-primary/50 border-med-border-default focus:border-med-border-focus"
                  />
                  {fieldErrors?.information && (
                    <p className="text-xs text-med-rose mt-1">
                      {fieldErrors.information.message}
                    </p>
                  )}
                </div>

                {/* Reveal Policy */}
                <div>
                  <Label
                    htmlFor={`${name}.${index}.reveal_policy`}
                    className="text-sm text-med-text-secondary mb-1.5"
                  >
                    Politique de révélation
                  </Label>
                  <Select
                    value={watch(`${name}.${index}.reveal_policy` as const) || ""}
                    onValueChange={(value: string | null) => {
                      if (value != null) {
                        setValue(
                          `${name}.${index}.reveal_policy` as const,
                          value,
                          { shouldValidate: true }
                        );
                      }
                    }}
                  >
                    <SelectTrigger
                      id={`${name}.${index}.reveal_policy`}
                      className="bg-med-bg-primary/50 border-med-border-default"
                    >
                      <SelectValue placeholder="Choisir une politique..." />
                    </SelectTrigger>
                    <SelectContent>
                      {REVEAL_POLICY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex flex-col items-start gap-1 py-1 w-full max-w-[400px]">
                            <span className="text-sm font-medium">{opt.label}</span>
                            <span className="text-xs text-med-text-muted font-mono whitespace-normal break-all leading-tight">
                              {opt.value}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      {/* Custom option: user types directly */}
                      <SelectItem value="__custom__">
                        <span className="text-sm italic">✏️ Personnalisé</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Show custom input when __custom__ is selected */}
                  {watch(`${name}.${index}.reveal_policy` as const) === "__custom__" && (
                    <Input
                      className="mt-2 bg-med-bg-primary/50 border-med-border-default"
                      placeholder="ex: only_if_chest_pain_asked"
                      onChange={(e) =>
                        setValue(
                          `${name}.${index}.reveal_policy` as const,
                          e.target.value || "__custom__",
                          { shouldValidate: true }
                        )
                      }
                    />
                  )}

                  {fieldErrors?.reveal_policy && (
                    <p className="text-xs text-med-rose mt-1">
                      {fieldErrors.reveal_policy.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
