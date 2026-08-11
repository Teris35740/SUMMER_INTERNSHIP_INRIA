"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  Settings,
  CheckCircle,
  Code,
} from "lucide-react";
import type { PipelineData } from "@/types/api";

interface PipelineAccordionsProps {
  data: PipelineData;
}

export function PipelineAccordions({ data }: PipelineAccordionsProps) {
  return (
    <Accordion multiple className="px-2">
      {/* ── Analysis ── */}
      <AccordionItem value="analysis" className="border-med-border-subtle">
        <AccordionTrigger className="text-sm text-med-text-secondary hover:text-med-text-primary hover:no-underline py-3 px-2">
          <span className="flex items-center gap-2">
            <HelpCircle size={16} className="text-med-sky" />
            Analyse de la Question
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-2 pb-3">
          {data.analysis ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-med-text-secondary font-medium">
                  Type de Question
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-med-emerald-subtle text-med-emerald">
                  {data.analysis.question_type}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-med-text-secondary font-medium">
                  Nécessite RAG
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    data.analysis.requires_retrieval
                      ? "bg-med-emerald-subtle text-med-emerald"
                      : "bg-med-bg-secondary text-med-text-muted"
                  }`}
                >
                  {data.analysis.requires_retrieval ? "Oui" : "Non"}
                </span>
              </div>
              {data.analysis.search_keywords && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-med-text-secondary font-medium">
                    Mots-clés
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-med-rose-subtle text-med-rose">
                    {data.analysis.search_keywords}
                  </span>
                </div>
              )}
              {data.analysis.target_slots &&
                data.analysis.target_slots.length > 0 && (
                  <div>
                    <span className="text-sm text-med-text-secondary font-medium">
                      Slots cibles
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {data.analysis.target_slots.map((slot, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-med-amber-subtle text-med-amber"
                        >
                          {slot}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <p className="text-sm text-med-text-muted italic">Aucune info</p>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* ── State Motor ── */}
      <AccordionItem value="motor" className="border-med-border-subtle">
        <AccordionTrigger className="text-sm text-med-text-secondary hover:text-med-text-primary hover:no-underline py-3 px-2">
          <span className="flex items-center gap-2">
            <Settings size={16} className="text-med-violet" />
            State Motor
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-2 pb-3">
          {data.stateMotorInfo ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-med-text-secondary font-medium">
                  Documents
                </span>
                <span className="text-med-text-primary">
                  Avant:{" "}
                  <strong>{data.stateMotorInfo.before_count}</strong> → Après:{" "}
                  <strong className="text-med-emerald">
                    {data.stateMotorInfo.after_count}
                  </strong>
                </span>
              </div>
              <div>
                <span className="text-sm text-med-text-secondary font-medium">
                  Topics globaux
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {data.stateMotorInfo.global_topics_used &&
                  data.stateMotorInfo.global_topics_used.length > 0 ? (
                    data.stateMotorInfo.global_topics_used.map(
                      (topicGroup, i) => {
                        if (Array.isArray(topicGroup)) {
                          return topicGroup.map((topic, j) => (
                            <span
                              key={`${i}-${j}`}
                              className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-med-violet-subtle text-med-violet"
                            >
                              {topic}
                            </span>
                          ));
                        }
                        return (
                          <span
                            key={i}
                            className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-med-violet-subtle text-med-violet"
                          >
                            {topicGroup}
                          </span>
                        );
                      }
                    )
                  ) : (
                    <span className="text-xs text-med-text-muted italic">
                      Aucun
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-med-text-muted italic">Aucune info</p>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* ── Verification ── */}
      <AccordionItem value="verification" className="border-med-border-subtle">
        <AccordionTrigger className="text-sm text-med-text-secondary hover:text-med-text-primary hover:no-underline py-3 px-2">
          <span className="flex items-center gap-2">
            <CheckCircle size={16} className="text-med-emerald" />
            Vérification
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-2 pb-3">
          {data.verificationInfo ? (
            <div className="space-y-2.5">
              {/* Valid badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  data.verificationInfo.is_valid
                    ? "bg-med-success-subtle text-med-success"
                    : "bg-med-error-subtle text-med-error"
                }`}
              >
                {data.verificationInfo.is_valid ? "✓ Valide" : "✗ Échec"}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-med-text-secondary font-medium">
                  Message
                </span>
                <span className="text-xs text-med-text-primary text-right max-w-[200px]">
                  {data.verificationInfo.message}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-med-text-secondary font-medium">
                  Tentatives
                </span>
                <span className="text-xs text-med-text-primary">
                  {data.verificationInfo.tentatives}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-med-text-secondary font-medium">
                  Nouvelle affirmation inventée
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    data.verificationInfo.contains_new_claim
                      ? "bg-med-rose-subtle text-med-rose"
                      : "bg-med-emerald-subtle text-med-emerald"
                  }`}
                >
                  {data.verificationInfo.contains_new_claim
                    ? "Oui ✗"
                    : "Non ✓"}
                </span>
              </div>

              {/* Authorized Fact IDs */}
              <div>
                <span className="text-sm text-med-text-secondary font-medium">
                  Fact IDs Autorisés
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {data.verificationInfo.authorized_fact_ids.length > 0 ? (
                    data.verificationInfo.authorized_fact_ids.map((id, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-med-bg-secondary text-med-text-primary border border-med-border-subtle"
                      >
                        {id}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-med-text-muted italic">
                      Aucun
                    </span>
                  )}
                </div>
              </div>

              {/* Used Fact IDs */}
              <div>
                <span className="text-sm text-med-text-secondary font-medium">
                  Fact IDs Utilisés
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {data.verificationInfo.used_fact_ids.length > 0 ? (
                    data.verificationInfo.used_fact_ids.map((id, i) => {
                      const isAuth =
                        data.verificationInfo!.authorized_fact_ids.includes(id);
                      return (
                        <span
                          key={i}
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isAuth
                              ? "bg-med-emerald-subtle text-med-emerald"
                              : "bg-med-rose-subtle text-med-rose"
                          }`}
                        >
                          {id}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-med-text-muted italic">
                      Aucun
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-med-text-muted italic">Aucune info</p>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* ── Raw JSON ── */}
      <AccordionItem value="json" className="border-med-border-subtle">
        <AccordionTrigger className="text-sm text-med-text-secondary hover:text-med-text-primary hover:no-underline py-3 px-2">
          <span className="flex items-center gap-2">
            <Code size={16} className="text-med-amber" />
            JSON Brut
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-2 pb-3">
          <pre className="p-3 rounded-lg bg-med-bg-secondary border border-med-border-subtle text-xs text-med-text-secondary overflow-x-auto font-mono max-h-[400px] overflow-y-auto">
            {data.rawJson
              ? JSON.stringify(data.rawJson, null, 2)
              : "{}"}
          </pre>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
