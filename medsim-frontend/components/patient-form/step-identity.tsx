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
import { User, Heart, Brain } from "lucide-react";
import type { PatientFormData } from "@/lib/schemas/patient-form-schema";

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

  return (
    <div className="space-y-8">
      {/* ── Section: Identité ── */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-med-sky-subtle">
            <User className="h-4 w-4 text-med-sky" />
          </div>
          <h3 className="text-lg font-semibold text-med-text-primary font-heading">
            Identité du patient
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Age */}
          <div className="space-y-2">
            <Label htmlFor="identity.age">
              Âge <span className="text-med-rose">*</span>
            </Label>
            <Input
              id="identity.age"
              type="number"
              min={0}
              max={120}
              {...register("identity.age")}
              placeholder="ex: 45"
              className="bg-med-bg-primary/50 border-med-border-default focus:border-med-border-focus"
            />
            {errors.identity?.age && (
              <p className="text-xs text-med-rose">{errors.identity.age.message}</p>
            )}
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="identity.gender">
              Genre <span className="text-med-rose">*</span>
            </Label>
            <Select
              value={watch("identity.gender") || ""}
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
                className="bg-med-bg-primary/50 border-med-border-default"
              >
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="homme">Homme</SelectItem>
                <SelectItem value="femme">Femme</SelectItem>
              </SelectContent>
            </Select>
            {errors.identity?.gender && (
              <p className="text-xs text-med-rose">{errors.identity.gender.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Section: Attitude du patient ── */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-med-violet-subtle">
            <Brain className="h-4 w-4 text-med-violet" />
          </div>
          <h3 className="text-lg font-semibold text-med-text-primary font-heading">
            Attitude du patient
          </h3>
        </div>

        <p className="text-sm text-med-text-muted -mt-2">
          Ces paramètres influencent le comportement du patient simulé (0 = minimum, 1 = maximum).
        </p>

        {/* Anxiety slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-med-text-secondary">Anxiété</Label>
            <span className="text-sm font-mono font-semibold text-med-sky">
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
        </div>

        {/* Precision slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-med-text-secondary">Précision</Label>
            <span className="text-sm font-mono font-semibold text-med-teal">
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
        </div>

        {/* Cooperativeness slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-med-text-secondary">Coopérativité</Label>
            <span className="text-sm font-mono font-semibold text-med-emerald">
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
        </div>
      </div>

      {/* ── Section: Motif de consultation ── */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-med-rose-subtle">
            <Heart className="h-4 w-4 text-med-rose" />
          </div>
          <h3 className="text-lg font-semibold text-med-text-primary font-heading">
            Motif de consultation
          </h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="chief_complaint.information">
            Plainte principale <span className="text-med-rose">*</span>
          </Label>
          <Textarea
            id="chief_complaint.information"
            {...register("chief_complaint.information")}
            placeholder="Ex: Dos complètement bloqué, impossibilité de se redresser."
            className="min-h-[100px] bg-med-bg-primary/50 border-med-border-default focus:border-med-border-focus"
          />
          {errors.chief_complaint?.information && (
            <p className="text-xs text-med-rose">
              {errors.chief_complaint.information.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
