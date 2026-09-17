import { z } from "zod";

// ── Sous-schémas réutilisables ──

const patientAttitudeSchema = z.object({
  anxiety: z.coerce.number().min(0).max(1).default(0.5),
  precision: z.coerce.number().min(0).max(1).default(0.5),
  cooperativeness: z.coerce.number().min(0).max(1).default(0.8),
});

/** Un fait médical (information + politique de révélation) */
const medicalFactSchema = z.object({
  information: z.string().min(1, "L'information est requise"),
  reveal_policy: z.string().min(1, "La politique de révélation est requise"),
});

const identitySchema = z.object({
  age: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z
      .number({
        required_error: "L'âge est requis",
        invalid_type_error: "L'âge doit être un nombre",
      })
      .int("L'âge doit être un entier")
      .min(0, "L'âge doit être positif")
      .max(120, "L'âge doit être ≤ 120")
  ),
  gender: z.enum(["homme", "femme"], { required_error: "Le genre est requis" }),
  patient_attitude: patientAttitudeSchema,
});

const chiefComplaintSchema = z.object({
  information: z.string().min(1, "Le motif de consultation est requis"),
  reveal_policy: z.string().default("direct_if_asked"),
});

const moleculeSchema = z.object({
  name: z.string().min(1, "Le nom de la molécule est requis"),
  dosage: z.string().min(1, "La posologie est requise"),
  route: z.string().min(1, "La voie d'administration est requise"),
  duration: z.string().min(1, "La durée est requise"),
});

const expectedTreatmentSchema = z.object({
  molecules: z.array(moleculeSchema).min(1, "Au moins une molécule"),
  contraindications_to_check: z.array(z.string().min(1)).default([]),
  notes: z.string().default(""), // Keeping this for the form, though we won't strictly use it in the JSON based on user feedback
});

const metadataSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"], { required_error: "La difficulté est requise" }),
  specialty: z.string().min(1, "La spécialité est requise"),
  expected_diagnosis: z.string().min(1, "Le diagnostic attendu est requis"),
  alternative_diagnoses: z.array(z.string().min(1, "Valeur requise")).min(1, "Au moins un diagnostic alternatif"),
  red_flags: z.array(z.string().min(1, "Valeur requise")).min(1, "Au moins un drapeau rouge"),
  expected_treatment: expectedTreatmentSchema,
});

export const patientImageFormSchema = z.object({
  id: z.string().optional(),
  file: z.any().optional(), // File instance in browser
  previewUrl: z.string().optional(),
  image_type: z.string().min(1, "Le type d'examen est requis"),
  description: z.string().default(""),
  reveal_policy: z.string().default("direct_if_asked"),
  linked_fact_ref: z.string().default(""), // reference key e.g. "history.0", "vitals.0", "cc1"
});

export type PatientImageFormData = z.infer<typeof patientImageFormSchema>;

// ── Schéma principal ──

export const patientFormSchema = z.object({
  identity: identitySchema,
  chief_complaint: chiefComplaintSchema,
  history: z.array(medicalFactSchema).min(1, "Au moins un élément d'anamnèse"),
  risk_factors: z.array(medicalFactSchema).default([]),
  travel_history: z.array(medicalFactSchema).default([]),
  family_history: z.array(medicalFactSchema).default([]),
  vitals: z.array(medicalFactSchema).min(1, "Au moins une constante vitale"),
  past_medical_history: z.array(medicalFactSchema).default([]),
  treatments: z.array(medicalFactSchema).default([]),
  allergies: z.array(medicalFactSchema).default([]),
  social_history: z.array(medicalFactSchema).default([]),
  surgical_history: z.array(medicalFactSchema).default([]),
  imaging: z.array(patientImageFormSchema).default([]),
  metadata: metadataSchema,
});

export type PatientFormData = z.infer<typeof patientFormSchema>;
export type MedicalFact = z.infer<typeof medicalFactSchema>;

// ── Reveal policy options courantes ──

export const REVEAL_POLICY_OPTIONS = [
  { value: "direct_if_asked", label: "Directe si demandé" },
  { value: "direct_if_medical_history_asked", label: "Si antécédents demandés" },
  { value: "direct_if_vitals_measured", label: "Si constantes mesurées" },
  { value: "direct_if_family_history_asked", label: "Si antécédents familiaux demandés" },
  { value: "direct_if_surgical_history_asked", label: "Si antécédents chirurgicaux demandés" },
  { value: "direct_if_allergies_asked", label: "Si allergies demandées" },
  { value: "direct_if_treatments_asked", label: "Si traitements demandés" },
  { value: "direct_if_travel_asked", label: "Si voyages demandés" },
  { value: "direct_if_job_explored", label: "Si profession explorée" },
  { value: "direct_if_tobacco_asked", label: "Si tabac demandé" },
  { value: "direct_if_alcohol_asked", label: "Si alcool demandé" },
  { value: "only_if_pain_scale_asked", label: "Si échelle de douleur demandée" },
  { value: "only_if_pain_type_asked", label: "Si type de douleur demandé" },
  { value: "only_if_irradiation_explored", label: "Si irradiation explorée" },
  { value: "only_if_aggravating_factors_asked", label: "Si facteurs aggravants demandés" },
  { value: "only_if_alleviating_factors_asked", label: "Si facteurs calmants demandés" },
  { value: "only_if_red_flags_explored", label: "Si drapeaux rouges explorés" },
  { value: "only_if_lifestyle_habits_asked", label: "Si habitudes de vie demandées" },
  { value: "only_if_social_context_explored", label: "Si contexte social exploré" },
  { value: "only_if_self_medication_asked", label: "Si automédication demandée" },
  { value: "only_if_respiratory_history_asked", label: "Si antécédents respiratoires demandés" },
  { value: "only_if_past_back_pain_asked", label: "Si douleurs dorsales passées demandées" },
  { value: "only_if_drug_allergies_specifically_asked", label: "Si allergies médicamenteuses demandées" },
] as const;

// ── Spécialités médicales ──

export const SPECIALTY_OPTIONS = [
  "Cardiologie",
  "Dermatologie",
  "Endocrinologie",
  "Gastro-entérologie",
  "Gériatrie",
  "Gynécologie",
  "Hématologie",
  "Infectiologie",
  "Médecine générale",
  "Médecine interne",
  "Néphrologie",
  "Neurologie",
  "Oncologie",
  "Ophtalmologie",
  "ORL",
  "Pédiatrie",
  "Pneumologie",
  "Psychiatrie",
  "Rhumatologie",
  "Urologie",
] as const;

// ── Types d'examens médicaux / imagerie ──

export const IMAGE_TYPE_OPTIONS = [
  { value: "Radiographie", label: "Radiographie (Rayons X)" },
  { value: "Échographie", label: "Échographie" },
  { value: "Scanner (TDM)", label: "Scanner / Tomodensitométrie (TDM)" },
  { value: "IRM", label: "IRM (Imagerie par Résonance Magnétique)" },
  { value: "Électrocardiogramme (ECG)", label: "Électrocardiogramme (ECG)" },
  { value: "Photo clinique", label: "Photographie clinique / Lésion" },
  { value: "Autre examen", label: "Autre examen complémentaire" },
] as const;

