"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  UploadCloud,
  ImageIcon,
  Link2,
  FileText,
  AlertCircle,
  Eye,
  CheckCircle2,
} from "lucide-react";
import {
  IMAGE_TYPE_OPTIONS,
  REVEAL_POLICY_OPTIONS,
  type PatientFormData,
} from "@/lib/schemas/patient-form-schema";
import { useMemo, useRef } from "react";

interface FactOption {
  ref: string; // e.g. "h1", "cc1", "v1"
  label: string;
  preview: string;
}

export function StepImaging() {
  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<PatientFormData>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "imaging",
  });

  // Watch form fields to extract all available clinical facts
  const chiefComplaint = watch("chief_complaint");
  const history = watch("history") || [];
  const vitals = watch("vitals") || [];
  const riskFactors = watch("risk_factors") || [];
  const pastMedicalHistory = watch("past_medical_history") || [];
  const surgicalHistory = watch("surgical_history") || [];

  // Generate the list of available facts that can be linked to an image
  const availableFacts = useMemo<FactOption[]>(() => {
    const list: FactOption[] = [];

    if (chiefComplaint?.information?.trim()) {
      list.push({
        ref: "cc1",
        label: "Motif principal",
        preview: chiefComplaint.information,
      });
    }

    history.forEach((fact, i) => {
      if (fact?.information?.trim()) {
        list.push({
          ref: `h${i + 1}`,
          label: `Histoire de la maladie #${i + 1}`,
          preview: fact.information,
        });
      }
    });

    vitals.forEach((fact, i) => {
      if (fact?.information?.trim()) {
        list.push({
          ref: `v${i + 1}`,
          label: `Constante vitale #${i + 1}`,
          preview: fact.information,
        });
      }
    });

    riskFactors.forEach((fact, i) => {
      if (fact?.information?.trim()) {
        list.push({
          ref: `rf${i + 1}`,
          label: `Facteur de risque #${i + 1}`,
          preview: fact.information,
        });
      }
    });

    pastMedicalHistory.forEach((fact, i) => {
      if (fact?.information?.trim()) {
        list.push({
          ref: `pmh${i + 1}`,
          label: `Antécédent médical #${i + 1}`,
          preview: fact.information,
        });
      }
    });

    surgicalHistory.forEach((fact, i) => {
      if (fact?.information?.trim()) {
        list.push({
          ref: `suh${i + 1}`,
          label: `Antécédent chirurgical #${i + 1}`,
          preview: fact.information,
        });
      }
    });

    return list;
  }, [
    chiefComplaint,
    history,
    vitals,
    riskFactors,
    pastMedicalHistory,
    surgicalHistory,
  ]);

  const handleFileSelected = (index: number, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setValue(`imaging.${index}.file`, file);
    setValue(`imaging.${index}.previewUrl`, previewUrl, { shouldValidate: true });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-med-border-default">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-med-sky-subtle text-med-sky border border-med-sky/20">
              <ImageIcon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-med-text-primary">
              Imagerie & Examens complémentaires
            </h2>
          </div>
          <p className="text-sm text-med-text-secondary mt-1">
            Associez des clichés (radiographie, échographie, scanner, ECG...) aux faits médicaux pour que le patient virtuel les dévoile au bon moment.
          </p>
        </div>

        <Button
          type="button"
          onClick={() =>
            append({
              image_type: "Radiographie",
              description: "",
              reveal_policy: "direct_if_asked",
              linked_fact_ref: availableFacts[0]?.ref || "h1",
            })
          }
          className="gap-2 bg-gradient-to-r from-med-sky to-med-teal text-white shadow-md shadow-med-sky/20 hover:scale-[1.01] active:scale-[0.99] transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Ajouter un examen</span>
        </Button>
      </div>

      {/* Empty State */}
      {fields.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-med-border-default bg-med-bg-surface/40 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-med-bg-secondary text-med-text-muted flex items-center justify-center mx-auto border border-med-border-default">
            <ImageIcon className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto">
            <p className="text-sm font-semibold text-med-text-primary">
              Aucun examen complémentaire ajouté
            </p>
            <p className="text-xs text-med-text-muted mt-1 leading-relaxed">
              Cette étape est optionnelle. Si votre patient a passé une radio ou une échographie, ajoutez-la ici pour que l&apos;étudiant puisse l&apos;analyser pendant la consultation.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                image_type: "Radiographie",
                description: "",
                reveal_policy: "direct_if_asked",
                linked_fact_ref: availableFacts[0]?.ref || "h1",
              })
            }
            className="gap-2 border-med-border-default hover:bg-med-bg-secondary"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un examen
          </Button>
        </div>
      )}

      {/* List of images */}
      <div className="space-y-5">
        {fields.map((field, index) => {
          const currentFile = watch(`imaging.${index}.file`);
          const currentPreviewUrl = watch(`imaging.${index}.previewUrl`);
          const currentType = watch(`imaging.${index}.image_type`);
          const currentLinkedRef = watch(`imaging.${index}.linked_fact_ref`);
          const currentPolicy = watch(`imaging.${index}.reveal_policy`);

          const selectedFact = availableFacts.find(
            (f) => f.ref === currentLinkedRef
          );

          return (
            <div
              key={field.id}
              className="rounded-2xl border border-med-border-default bg-med-bg-surface/70 p-5 shadow-xs transition-all hover:border-med-border-strong space-y-4 relative"
            >
              {/* Badge & Delete */}
              <div className="flex items-center justify-between pb-3 border-b border-med-border-subtle">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-med-sky-subtle text-med-sky border border-med-sky/30">
                    Examen #{index + 1}
                  </span>
                  <span className="text-xs font-semibold text-med-text-primary">
                    {currentType || "Examen médical"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-med-text-muted hover:text-med-rose p-1.5 rounded-lg hover:bg-med-rose-subtle transition-colors"
                  title="Supprimer cet examen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left: Dropzone & Preview */}
                <div className="lg:col-span-4 flex flex-col">
                  <Label className="text-xs font-bold uppercase tracking-wider text-med-text-muted mb-1.5 block">
                    Fichier image (Radio, Écho, ECG…)
                  </Label>

                  {currentPreviewUrl ? (
                    <div className="relative group rounded-xl overflow-hidden border border-med-border-default bg-black/40 aspect-4/3 flex items-center justify-center shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentPreviewUrl}
                        alt="Aperçu de l'examen"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3 text-center">
                        <span className="text-xs font-semibold text-white truncate max-w-[90%]">
                          {currentFile?.name || "Fichier sélectionné"}
                        </span>
                        <label className="px-3 py-1.5 bg-white text-med-text-primary rounded-lg text-xs font-bold cursor-pointer hover:bg-med-bg-surface transition-colors">
                          Remplacer
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileSelected(index, f);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-med-border-default hover:border-med-sky rounded-xl aspect-4/3 flex flex-col items-center justify-center p-4 text-center cursor-pointer bg-med-bg-secondary/40 hover:bg-med-sky-subtle/20 transition-all group">
                      <div className="p-3 rounded-full bg-med-bg-surface text-med-text-muted group-hover:text-med-sky group-hover:scale-110 transition-all mb-2 shadow-xs">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-bold text-med-text-primary group-hover:text-med-sky transition-colors">
                        Choisir une image
                      </span>
                      <span className="text-[0.65rem] text-med-text-muted mt-1">
                        PNG, JPG, WebP jusqu&apos;à 15 Mo
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileSelected(index, f);
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Right: Meta & Link to fact */}
                <div className="lg:col-span-8 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Exam Type */}
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-med-text-muted mb-1.5 block">
                        Type d&apos;examen
                      </Label>
                      <Select
                        value={currentType || "Radiographie"}
                        onValueChange={(val: string | null) => {
                          if (val) {
                            setValue(`imaging.${index}.image_type`, val, {
                              shouldValidate: true,
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="bg-med-bg-surface border-med-border-default hover:border-med-border-strong rounded-xl shadow-xs">
                          <SelectValue placeholder="Choisir un type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {IMAGE_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Linked Fact Selector */}
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-med-text-muted mb-1.5 flex items-center gap-1">
                        <Link2 className="h-3 w-3 text-med-sky" />
                        <span>Fait clinique déclencheur</span>
                      </Label>
                      {availableFacts.length > 0 ? (
                        <Select
                          value={currentLinkedRef || availableFacts[0].ref}
                          onValueChange={(val: string | null) => {
                            if (val) {
                              setValue(`imaging.${index}.linked_fact_ref`, val, {
                                shouldValidate: true,
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="bg-med-bg-surface border-med-border-default hover:border-med-border-strong rounded-xl shadow-xs truncate">
                            <SelectValue placeholder="Lier à un fait..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[260px]">
                            {availableFacts.map((fact) => (
                              <SelectItem key={fact.ref} value={fact.ref}>
                                <div className="flex flex-col items-start gap-0.5 max-w-[320px] text-left">
                                  <span className="text-xs font-bold text-med-text-primary">
                                    {fact.label}
                                  </span>
                                  <span className="text-[0.7rem] text-med-text-muted line-clamp-2">
                                    {fact.preview}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-2 rounded-lg bg-med-amber-subtle/40 border border-med-amber/30 text-[0.7rem] text-med-amber flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Renseignez d&apos;abord des faits dans l&apos;Anamnèse.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fact preview banner */}
                  {selectedFact && (
                    <div className="p-2.5 rounded-xl bg-med-sky-subtle/30 border border-med-sky/20 flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-med-sky shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-[0.65rem] font-bold text-med-sky uppercase tracking-wider block">
                          Lié à : {selectedFact.label}
                        </span>
                        <p className="text-xs text-med-text-secondary line-clamp-2 mt-0.5">
                          {selectedFact.preview}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Description / Medical report */}
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-med-text-muted mb-1.5 block">
                      Description clinique / Conclusion du cliché
                    </Label>
                    <Textarea
                      {...register(`imaging.${index}.description` as const)}
                      placeholder="Ex : Radiographie du rachis lombaire face/profil montrant un pincement discal L5-S1 sans fracture visible…"
                      className="min-h-[64px] resize-y bg-med-bg-surface border-med-border-default hover:border-med-border-strong focus:border-med-sky focus:ring-2 focus:ring-med-sky/20 transition-all rounded-xl shadow-xs text-xs"
                    />
                  </div>

                  {/* Reveal policy (Optional override) */}
                  <div>
                    <Label className="text-[0.65rem] font-bold uppercase tracking-wider text-med-text-muted mb-1 block">
                      Politique de révélation
                    </Label>
                    <Select
                      value={currentPolicy || "direct_if_asked"}
                      onValueChange={(val: string | null) => {
                        if (val) {
                          setValue(`imaging.${index}.reveal_policy`, val, {
                            shouldValidate: true,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="bg-med-bg-surface border-med-border-default hover:border-med-border-strong rounded-xl shadow-xs text-xs h-9">
                        <SelectValue placeholder="Politique..." />
                      </SelectTrigger>
                      <SelectContent>
                        {REVEAL_POLICY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="text-xs font-medium">{opt.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
