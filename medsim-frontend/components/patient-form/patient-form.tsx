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
import { createPatient, uploadPatientImage } from "@/lib/api";
import { StepIdentity } from "./step-identity";
import { StepAnamnesis } from "./step-anamnesis";
import { StepContext } from "./step-context";
import { StepImaging } from "./step-imaging";
import { StepMetadata } from "./step-metadata";
import { StepTreatment } from "./step-treatment";
import {
  User,
  Stethoscope,
  Users,
  ImageIcon,
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
    shortLabel: "Identité",
    description: "Âge, genre, traits de personnalité et plainte initiale",
    icon: User,
    fields: ["identity", "chief_complaint"] as const,
  },
  {
    id: "anamnesis",
    label: "Anamnèse",
    shortLabel: "Anamnèse",
    description: "Histoire de la maladie, constantes vitales et antécédents",
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
    shortLabel: "Contexte",
    description: "Antécédents familiaux, mode de vie, voyages et traitements",
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
    id: "imaging",
    label: "Imagerie & Examens",
    shortLabel: "Imagerie",
    description: "Clichés radiologiques, échographies et comptes-rendus",
    icon: ImageIcon,
    fields: ["imaging"] as const,
  },
  {
    id: "metadata",
    label: "Métadonnées",
    shortLabel: "Diagnostic",
    description: "Diagnostic attendu, diagnostics alternatifs et alertes",
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
    shortLabel: "Traitement",
    description: "Molécules prescrites, posologie et contre-indications",
    icon: Pill,
    fields: ["metadata.expected_treatment"] as const,
  },
] as const;

// ── Default form values ──

const DEFAULT_VALUES: PatientFormData = {
  identity: {
    age: "" as unknown as number,
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
  imaging: [],
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
        // Specific feedback depending on current step
        if (currentStep === 0) {
          const values = methods.getValues();
          const age = values.identity?.age;
          if (age === undefined || age === null || (age as unknown) === "" || isNaN(Number(age))) {
            toast.error("Veuillez renseigner l'âge du patient.");
            document.getElementById("identity.age")?.focus();
          } else if (!values.identity?.gender) {
            toast.error("Veuillez sélectionner le genre (Homme ou Femme).");
            document.getElementById("identity.gender")?.focus();
          } else if (!values.chief_complaint?.information?.trim()) {
            toast.error("Veuillez renseigner le motif de consultation (plainte principale).");
            document.getElementById("chief_complaint.information")?.focus();
          } else {
            toast.error("Veuillez compléter les champs obligatoires de l'étape 1.");
          }
        } else if (currentStep === 1) {
          toast.error("Veuillez renseigner les informations requises dans l'anamnèse.");
        } else if (currentStep === 4) {
          toast.error("Veuillez renseigner le diagnostic attendu et la spécialité.");
        } else {
          toast.error("Veuillez compléter les champs obligatoires avant de continuer.");
        }
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
      // 1. Création du dossier patient et indexation vectorielle
      const result = await createPatient(data as unknown as Record<string, unknown>);

      // 2. Téléversement des clichés d'imagerie attachés aux faits
      if (data.imaging && data.imaging.length > 0) {
        for (const imgItem of data.imaging) {
          if (imgItem.file) {
            const formData = new FormData();
            formData.append("file", imgItem.file);
            formData.append("image_type", imgItem.image_type || "Radiographie");
            if (imgItem.description) {
              formData.append("description", imgItem.description);
            }
            if (imgItem.reveal_policy) {
              formData.append("reveal_policy", imgItem.reveal_policy);
            }
            if (imgItem.linked_fact_ref) {
              formData.append("fact_id", imgItem.linked_fact_ref);
            }
            try {
              await uploadPatientImage(result.patient_id, formData);
            } catch (imgErr) {
              console.error("Failed to upload image:", imgErr);
              toast.warning(`Avertissement : L'image ${imgItem.file.name} n'a pas pu être téléversée.`);
            }
          }
        }
      }

      toast.success(
        `Patient ${result.patient_id} créé avec succès ! Dossier clinique et imagerie prêts. ✅`,
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
          className="max-w-4xl mx-auto space-y-6"
        >
          {/* ── Stepper indicator ── */}
          <div className="glass rounded-2xl p-5 sm:p-6 border border-med-border-subtle shadow-sm space-y-5">
            {/* Active Step Top Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-med-border-subtle">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-med-sky-subtle text-med-sky">
                    Étape {currentStep + 1} / {STEPS.length}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-med-text-primary font-heading">
                    {STEPS[currentStep].label}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-med-text-secondary">
                  {STEPS[currentStep].description}
                </p>
              </div>
              <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                <span className="text-xs font-semibold text-med-text-muted">
                  {Math.round(((currentStep + 1) / STEPS.length) * 100)}%
                </span>
                <div className="w-24 h-2 rounded-full bg-med-bg-secondary overflow-hidden border border-med-border-subtle">
                  <div
                    className="h-full bg-med-sky transition-all duration-300 rounded-full"
                    style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Track line & Step Circles */}
            <div className="relative pt-1">
              {/* Underlying continuous bar */}
              <div className="absolute top-5 left-6 right-6 h-0.5 bg-med-border-default -translate-y-1/2 -z-0" />
              <div
                className="absolute top-5 left-6 h-0.5 bg-med-emerald transition-all duration-500 -translate-y-1/2 -z-0"
                style={{
                  width: `calc(${Math.min(currentStep, STEPS.length - 1) / (STEPS.length - 1)} * (100% - 3rem))`,
                }}
              />

              <div className="grid grid-cols-6 relative z-10 gap-1">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;
                  const hasErrors = step.fields.some(
                    (f) => errors[f as keyof PatientFormData]
                  );

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => goToStep(index)}
                      className="flex flex-col items-center group cursor-pointer focus:outline-none"
                    >
                      {/* Step circle */}
                      <div
                        className={`
                          relative flex items-center justify-center w-10 h-10 rounded-full
                          transition-all duration-300 shrink-0
                          ${
                            isActive
                              ? "bg-med-sky text-med-text-inverse shadow-md ring-4 ring-med-sky-subtle scale-105"
                              : isCompleted
                                ? "bg-med-emerald text-med-text-inverse hover:scale-105"
                                : hasErrors
                                  ? "bg-med-rose-subtle text-med-rose border-2 border-med-rose"
                                  : "bg-med-bg-surface text-med-text-muted border border-med-border-default group-hover:border-med-sky/50 group-hover:text-med-text-primary"
                          }
                        `}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4 stroke-[2.5]" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>

                      {/* Step label below */}
                      <span
                        className={`
                          mt-2 text-xs font-medium text-center truncate w-full px-0.5 transition-colors
                          ${
                            isActive
                              ? "text-med-sky font-semibold"
                              : isCompleted
                                ? "text-med-text-primary"
                                : "text-med-text-muted group-hover:text-med-text-secondary"
                          }
                        `}
                      >
                        {step.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Step content ── */}
          <div className="glass rounded-2xl p-6 sm:p-8 min-h-[420px] shadow-sm border border-med-border-subtle">
            <div className="animate-fade-in" key={currentStep}>
              {currentStep === 0 && <StepIdentity />}
              {currentStep === 1 && <StepAnamnesis />}
              {currentStep === 2 && <StepContext />}
              {currentStep === 3 && <StepImaging />}
              {currentStep === 4 && <StepMetadata />}
              {currentStep === 5 && <StepTreatment />}
            </div>
          </div>

          {/* ── Navigation buttons ── */}
          <div className="sticky bottom-4 z-30 glass rounded-2xl p-3.5 sm:p-4 border border-med-border-subtle shadow-xl flex items-center justify-between backdrop-blur-lg bg-med-bg-surface/90">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="gap-2 border-med-border-default hover:bg-med-bg-surface-hover rounded-xl shadow-xs"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>

            <div className="flex items-center gap-1.5 text-xs text-med-text-muted">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? "w-6 bg-med-sky"
                      : i < currentStep
                        ? "w-2 bg-med-emerald"
                        : "w-2 bg-med-border-default"
                  }`}
                />
              ))}
            </div>

            {isLastStep ? (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gap-2 bg-gradient-user-msg text-med-text-inverse hover:opacity-90 transition-opacity rounded-xl shadow-md px-5"
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
                className="gap-2 bg-med-sky text-med-text-inverse hover:bg-med-sky-hover transition-colors rounded-xl shadow-md px-5"
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
