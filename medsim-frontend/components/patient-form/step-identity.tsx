"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Heart, Brain, Info } from "lucide-react";
import type { PatientFormData } from "@/lib/schemas/patient-form-schema";

function getAttitudeBadge(val: number, type: "anxiety" | "precision" | "cooperation") {
  if (type === "anxiety") {
    if (val < 0.35) return { label: "Calme", color: "text-med-emerald bg-med-emerald-subtle" };
    if (val < 0.7) return { label: "Modéré", color: "text-med-amber bg-med-amber-subtle" };
    return { label: "Très anxieux", color: "text-med-rose bg-med-rose-subtle" };
  }
  if (type === "precision") {
    if (val < 0.35) return { label: "Vague / Évasif", color: "text-med-amber bg-med-amber-subtle" };
    if (val < 0.7) return { label: "Normal", color: "text-med-sky bg-med-sky-subtle" };
    return { label: "Très précis", color: "text-med-teal bg-med-teal-subtle" };
  }
  // cooperation
  if (val < 0.35) return { label: "Réticent", color: "text-med-rose bg-med-rose-subtle" };
  if (val < 0.7) return { label: "Coopératif", color: "text-med-sky bg-med-sky-subtle" };
  return { label: "Très collaboratif", color: "text-med-emerald bg-med-emerald-subtle" };
}

export function StepIdentity() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<PatientFormData>();

  const anxiety = watch("identity.patient_attitude.anxiety") ?? 0.5;
  const precision = watch("identity.patient_attitude.precision") ?? 0.5;
  const cooperativeness = watch("identity.patient_attitude.cooperativeness") ?? 0.8;

  const anxietyBadge = getAttitudeBadge(anxiety, "anxiety");
  const precisionBadge = getAttitudeBadge(precision, "precision");
  const coopBadge = getAttitudeBadge(cooperativeness, "cooperation");

  return (
    <div className="space-y-6">
      {/* ── Section 1: Identité & Motif de consultation (Requis) ── */}
      <div className="rounded-2xl border border-med-border-subtle bg-med-bg-surface/60 p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-med-sky-subtle text-med-sky shrink-0">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-med-text-primary font-heading">
              Identité & Motif de consultation
            </h3>
            <p className="text-xs text-med-text-muted">
              Données démographiques et raison de la venue du patient
            </p>
          </div>
        </div>

        {/* Age & Genre */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Age */}
          <div className="space-y-1.5">
            <Label htmlFor="identity.age" className="text-sm font-medium text-med-text-secondary flex items-center justify-between">
              <span>
                Âge <span className="text-med-rose">*</span>
              </span>
              <span className="text-xs text-med-text-muted font-normal">(0 à 120 ans)</span>
            </Label>
            <Input
              id="identity.age"
              type="number"
              min={0}
              max={120}
              {...register("identity.age")}
              placeholder="Ex: 45"
              className="bg-med-bg-surface border-med-border-default hover:border-med-border-strong focus:border-med-sky focus:ring-2 focus:ring-med-sky/20 transition-all rounded-xl shadow-xs"
            />
            {errors.identity?.age && (
              <p className="text-xs text-med-rose font-medium mt-1">{errors.identity.age.message}</p>
            )}
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <Label htmlFor="identity.gender" className="text-sm font-medium text-med-text-secondary">
              Genre <span className="text-med-rose">*</span>
            </Label>
            <Select
              value={watch("identity.gender") || null}
              onValueChange={(val: string | null) => {
                if (val != null) {
                  setValue("identity.gender", val as "homme" | "femme", {
                    shouldValidate: true,
                  });
                }
              }}
            >
              <SelectTrigger
                id="identity.gender"
                className="bg-med-bg-surface border-med-border-default hover:border-med-border-strong rounded-xl shadow-xs"
              >
                <SelectValue placeholder="Sélectionner le genre..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="homme">Homme</SelectItem>
                <SelectItem value="femme">Femme</SelectItem>
              </SelectContent>
            </Select>
            {errors.identity?.gender && (
              <p className="text-xs text-med-rose font-medium mt-1">{errors.identity.gender.message}</p>
            )}
          </div>
        </div>

        {/* Motif de consultation */}
        <div className="space-y-1.5 pt-2 border-t border-med-border-subtle">
          <Label htmlFor="chief_complaint.information" className="text-sm font-medium text-med-text-secondary flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-med-rose" />
              <span>Motif de consultation (Plainte principale)</span>
              <span className="text-med-rose">*</span>
            </span>
            <span className="text-xs text-med-text-muted font-normal">Première déclaration du patient</span>
          </Label>
          <Textarea
            id="chief_complaint.information"
            {...register("chief_complaint.information")}
            placeholder="Ex: Dos complètement bloqué depuis ce matin après avoir soulevé un carton lourd, impossibilité de me redresser..."
            className="min-h-[85px] bg-med-bg-surface border-med-border-default hover:border-med-border-strong focus:border-med-sky focus:ring-2 focus:ring-med-sky/20 transition-all rounded-xl shadow-xs resize-y"
          />
          {errors.chief_complaint?.information ? (
            <p className="text-xs text-med-rose font-medium mt-1">
              {errors.chief_complaint.information.message}
            </p>
          ) : (
            <p className="text-xs text-med-text-muted flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-med-sky shrink-0" />
              Cette phrase sera prononcée par le patient dès l&apos;ouverture du dialogue ou sur demande.
            </p>
          )}
        </div>
      </div>

      {/* ── Section 2: Attitude & Personnalité simulée (Compact) ── */}
      <div className="rounded-2xl border border-med-border-subtle bg-med-bg-surface/60 p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-med-violet-subtle text-med-violet shrink-0">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-med-text-primary font-heading">
              Attitude & Personnalité simulée
            </h3>
            <p className="text-xs text-med-text-muted">
              Paramètres comportementaux du patient (0.0 = min, 1.0 = max)
            </p>
          </div>
        </div>

        {/* 3 Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Anxiety */}
          <div className="rounded-xl bg-med-bg-secondary/40 border border-med-border-subtle p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-semibold text-med-text-primary">Anxiété</Label>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${anxietyBadge.color}`}>
                  {anxietyBadge.label}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-med-sky">
                {anxiety.toFixed(2)}
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[anxiety]}
              onValueChange={(v) =>
                setValue("identity.patient_attitude.anxiety", Array.isArray(v) ? v[0] : v)
              }
            />
            <div className="flex justify-between text-[10px] text-med-text-muted">
              <span>0 (Calme)</span>
              <span>1 (Paniqué)</span>
            </div>
          </div>

          {/* Precision */}
          <div className="rounded-xl bg-med-bg-secondary/40 border border-med-border-subtle p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-semibold text-med-text-primary">Précision</Label>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${precisionBadge.color}`}>
                  {precisionBadge.label}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-med-teal">
                {precision.toFixed(2)}
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[precision]}
              onValueChange={(v) =>
                setValue("identity.patient_attitude.precision", Array.isArray(v) ? v[0] : v)
              }
            />
            <div className="flex justify-between text-[10px] text-med-text-muted">
              <span>0 (Vague)</span>
              <span>1 (Précis)</span>
            </div>
          </div>

          {/* Cooperativeness */}
          <div className="rounded-xl bg-med-bg-secondary/40 border border-med-border-subtle p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-semibold text-med-text-primary">Coopération</Label>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${coopBadge.color}`}>
                  {coopBadge.label}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-med-emerald">
                {cooperativeness.toFixed(2)}
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[cooperativeness]}
              onValueChange={(v) =>
                setValue("identity.patient_attitude.cooperativeness", Array.isArray(v) ? v[0] : v)
              }
            />
            <div className="flex justify-between text-[10px] text-med-text-muted">
              <span>0 (Réticent)</span>
              <span>1 (Collaboratif)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
