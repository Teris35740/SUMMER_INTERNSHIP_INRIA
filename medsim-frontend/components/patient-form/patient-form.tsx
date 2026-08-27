"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  patientFormSchema,
  type PatientFormData,
} from "@/lib/schemas/patient-form-schema";
import { createPatient } from "@/lib/api";
import { StepIdentity } from "./step-identity";
import { StepAnamnesis } from "./step-anamnesis";
import { StepContext } from "./step-context";
import { StepMetadata } from "./step-metadata";
import { StepTreatment } from "./step-treatment";
import {
  User,
  Stethoscope,
  Users,
  Target,
  Pill,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  Check,
} from "lucide-react";

// ── Steps config ──

const STEPS = [
  {
    id: "identity",
    label: "Identité & Motif",
    icon: User,
    fields: ["identity", "chief_complaint"] as const,
  },
  {
    id: "anamnesis",
    label: "Anamnèse",
    icon: Stethoscope,
    fields: [
      "history",
      "vitals",
      "risk_factors",
      "past_medical_history",
      "surgical_history",
    ] as const,
  },
  {
    id: "context",
    label: "Contexte",
    icon: Users,
    fields: [
      "family_history",
      "travel_history",
      "social_history",
      "treatments",
      "allergies",
    ] as const,
  },
  {
    id: "metadata",
    label: "Métadonnées",
    icon: Target,
    fields: [
      "metadata.difficulty",
      "metadata.specialty",
      "metadata.expected_diagnosis",
      "metadata.alternative_diagnoses",
      "metadata.red_flags",
    ] as const,
  },
  {
    id: "treatment",
    label: "Traitement attendu",
    icon: Pill,
    fields: ["metadata.expected_treatment"] as const,
  },
] as const;

// ── Default form values ──

const DEFAULT_VALUES: PatientFormData = {
  identity: {
    age: 0 as unknown as number,
    gender: "" as "homme" | "femme",
    patient_attitude: {
      anxiety: 0.5,
      precision: 0.5,
      cooperativeness: 0.8,
    },
  },
  chief_complaint: {
    information: "",
    reveal_policy: "direct_if_asked",
  },
  history: [{ information: "", reveal_policy: "direct_if_asked_about_onset" }],
  risk_factors: [],
  travel_history: [],
  family_history: [],
  vitals: [{ information: "", reveal_policy: "direct_if_vitals_measured" }],
  past_medical_history: [],
  treatments: [],
  allergies: [],
  social_history: [],
  surgical_history: [],
  metadata: {
    difficulty: "" as "easy" | "medium" | "hard",
    specialty: "",
    expected_diagnosis: "",
    alternative_diagnoses: [""],
    red_flags: [""],
    expected_treatment: {
      molecules: [],
      contraindications_to_check: [],
      notes: "",
    },
  },
};

export function PatientForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema) as any,
    defaultValues: DEFAULT_VALUES as any,
    mode: "onChange",
  });

  const {
    handleSubmit,
    trigger,
    formState: { errors },
  } = methods;

  // ── Step navigation ──

  const goToStep = async (targetStep: number) => {
    // Validate current step fields before moving forward
    if (targetStep > currentStep) {
      const currentFields = STEPS[currentStep].fields as unknown as (keyof PatientFormData)[];
      const isValid = await trigger(currentFields);
      if (!isValid) {
        toast.error("Veuillez corriger les erreurs avant de continuer.");
        return;
      }
    }
    setCurrentStep(targetStep);
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const nextStep = () => goToStep(currentStep + 1);
  const prevStep = () => goToStep(currentStep - 1);

  // ── Submit ──

  const onSubmit = async (data: PatientFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createPatient(data as unknown as Record<string, unknown>);
      toast.success(
        `Patient ${result.patient_id} créé avec succès ! Ingestion RAG terminée. ✅`,
        { duration: 5000 }
      );
      router.push("/");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`Échec de la création : ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (errors: any) => {
    const errorKeys = Object.keys(errors).map(key => {
      if (typeof errors[key] === 'object' && errors[key] !== null && !errors[key].message) {
        // Nested error (e.g., identity, metadata)
        return `${key}: ${Object.keys(errors[key]).join(', ')}`;
      }
      return key;
    });
    console.error("Form validation failed on fields:", errorKeys);
    toast.error("Certains champs requis n'ont pas été remplis correctement.");
  };

  const isLastStep = currentStep === STEPS.length - 1;

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLastStep) {
      handleSubmit(onSubmit as any, onError)(e);
    } else {
      nextStep();
    }
  };

  return (
    <>
      {/* Loading overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-med-bg-primary/80 backdrop-blur-sm">
          <div className="glass-panel rounded-2xl p-8 max-w-md w-full mx-4 text-center space-y-5 animate-card-scale-in">
            <div className="mx-auto w-16 h-16 rounded-full bg-med-sky-subtle flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-med-sky animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-med-text-primary font-heading">
                Création en cours...
              </h3>
              <p className="text-sm text-med-text-secondary mt-2">
                Sauvegarde du dossier patient et ingestion dans la base vectorielle.
                <br />
                Cela peut prendre quelques secondes.
              </p>
            </div>
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-med-sky"
                  style={{
                    animation: `typingBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <FormProvider {...methods}>
        <form
          onSubmit={onFormSubmit}
          className="max-w-3xl mx-auto space-y-8"
        >
          {/* ── Stepper indicator ── */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                const hasErrors = step.fields.some(
                  (f) => errors[f as keyof PatientFormData]
                );

                return (
                  <div key={step.id} className="flex items-center flex-1 last:flex-none">
                    {/* Step circle */}
                    <button
                      type="button"
                      onClick={() => goToStep(index)}
                      className={`
                        relative flex items-center justify-center w-10 h-10 rounded-full
                        transition-all duration-300 shrink-0
                        ${
                          isActive
                            ? "bg-med-sky text-med-text-inverse shadow-lg ring-4 ring-med-sky-subtle scale-110"
                            : isCompleted
                              ? "bg-med-emerald text-med-text-inverse"
                              : hasErrors
                                ? "bg-med-rose-subtle text-med-rose border-2 border-med-rose"
                                : "bg-med-bg-secondary text-med-text-muted border border-med-border-default"
                        }
                      `}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </button>

                    {/* Step label (below on larger screens) */}
                    <span
                      className={`
                        hidden sm:block ml-2 text-sm font-medium transition-colors
                        ${
                          isActive
                            ? "text-med-sky"
                            : isCompleted
                              ? "text-med-emerald"
                              : "text-med-text-muted"
                        }
                      `}
                    >
                      {step.label}
                    </span>

                    {/* Connector line */}
                    {index < STEPS.length - 1 && (
                      <div className="flex-1 mx-3 h-0.5 rounded-full overflow-hidden bg-med-border-default">
                        <div
                          className="h-full bg-med-emerald rounded-full transition-all duration-500"
                          style={{ width: isCompleted ? "100%" : "0%" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Step content ── */}
          <div className="glass rounded-2xl p-6 sm:p-8 min-h-[400px]">
            <div className="animate-fade-in" key={currentStep}>
              {currentStep === 0 && <StepIdentity />}
              {currentStep === 1 && <StepAnamnesis />}
              {currentStep === 2 && <StepContext />}
              {currentStep === 3 && <StepMetadata />}
              {currentStep === 4 && <StepTreatment />}
            </div>
          </div>

          {/* ── Navigation buttons ── */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="gap-2 border-med-border-default hover:bg-med-bg-surface-hover"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>

            <span className="text-sm text-med-text-muted">
              Étape {currentStep + 1} / {STEPS.length}
            </span>

            {isLastStep ? (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gap-2 bg-gradient-user-msg text-med-text-inverse hover:opacity-90 transition-opacity"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Créer le patient
              </Button>
            ) : (
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  nextStep();
                }}
                className="gap-2 bg-med-sky text-med-text-inverse hover:bg-med-sky-hover transition-colors"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </>
  );
}
