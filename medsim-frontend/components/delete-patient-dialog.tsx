"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, AlertTriangle, Search, Lock } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import type { Patient } from "@/types/api";

interface DeletePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: Patient[];
  onDelete: (num: number) => Promise<void>;
}

export function DeletePatientDialog({
  open,
  onOpenChange,
  patients,
  onDelete,
}: DeletePatientDialogProps) {
  const { isProfessor } = useAuth();
  const [selectedNum, setSelectedNum] = useState<number | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState("");

  const selectedPatient = patients.find((p) => p.num === selectedNum);

  const filteredPatients = patients.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      String(p.num).includes(q) ||
      (p.chief_complaint || "").toLowerCase().includes(q) ||
      (p.specialty || "").toLowerCase().includes(q)
    );
  });

  const handleClose = () => {
    setSelectedNum(null);
    setConfirmStep(false);
    setSearch("");
    onOpenChange(false);
  };

  const handleSelectPatient = (num: number) => {
    setSelectedNum(num);
    setConfirmStep(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedNum === null) return;
    setIsDeleting(true);
    try {
      await onDelete(selectedNum);
      handleClose();
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBack = () => {
    setConfirmStep(false);
    setSelectedNum(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass sm:max-w-[520px] border-med-border-default">
        {/* ── Deleting overlay ── */}
        {isDeleting && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-med-bg-primary/80 backdrop-blur-sm rounded-2xl">
            <div className="text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-med-rose-subtle flex items-center justify-center">
                <Loader2 className="h-7 w-7 text-med-rose animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold text-med-text-primary">
                  Suppression en cours...
                </p>
                <p className="text-xs text-med-text-secondary mt-1">
                  Suppression du fichier et des chunks vectoriels.
                </p>
              </div>
            </div>
          </div>
        )}

        {!confirmStep ? (
          <>
            {/* ── Selection step ── */}
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-med-text-primary font-heading">
                <Trash2 className="h-5 w-5 text-med-rose" />
                Supprimer un patient
              </DialogTitle>
              <DialogDescription className="text-med-text-secondary">
                Sélectionnez le patient à supprimer. Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>

            {/* Search */}
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-med-text-muted" />
              <Input
                placeholder="Rechercher un patient..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-med-bg-secondary/50 border-med-border-subtle"
              />
            </div>

            {/* Patient list */}
            <ScrollArea className="max-h-[320px] mt-2 -mx-1 px-1">
              <div className="space-y-1.5">
                {filteredPatients.length === 0 ? (
                  <p className="text-sm text-med-text-muted text-center py-6">
                    Aucun patient trouvé.
                  </p>
                ) : (
                  filteredPatients.map((p) => (
                    <button
                      key={p.num}
                      type="button"
                      onClick={() => handleSelectPatient(p.num)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                                 bg-med-bg-surface/50 border border-transparent
                                 hover:bg-med-rose-subtle/30 hover:border-med-rose/20
                                 transition-all duration-150 cursor-pointer group"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-med-bg-secondary text-med-text-secondary text-xs font-bold shrink-0 group-hover:bg-med-rose-subtle group-hover:text-med-rose transition-colors">
                        #{String(p.num).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-med-text-primary truncate">
                          {p.chief_complaint || "Patient sans motif"}
                        </p>
                        {p.specialty && (
                          <p className="text-xs text-med-text-muted truncate">
                            {p.specialty}
                          </p>
                        )}
                      </div>
                      <Trash2 className="h-4 w-4 text-med-text-muted opacity-0 group-hover:opacity-100 group-hover:text-med-rose transition-all" />
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <>
            {/* ── Confirmation step ── */}
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-med-text-primary font-heading">
                <AlertTriangle className="h-5 w-5 text-med-amber" />
                Confirmer la suppression
              </DialogTitle>
            </DialogHeader>

            <div className="mt-2 p-4 rounded-xl bg-med-rose-subtle/30 border border-med-rose/20 space-y-3">
              <p className="text-sm text-med-text-primary">
                Vous êtes sur le point de supprimer définitivement :
              </p>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-med-bg-surface/80">
                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-med-rose-subtle text-med-rose text-sm font-bold">
                  #{String(selectedNum).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-sm font-semibold text-med-text-primary">
                    {selectedPatient?.chief_complaint || "Patient"}
                  </p>
                  {selectedPatient?.specialty && (
                    <Badge
                      variant="outline"
                      className="text-[0.65rem] mt-1 border-med-border-subtle text-med-text-secondary"
                    >
                      {selectedPatient.specialty}
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-xs text-med-text-secondary">
                ⚠️ Le fichier JSON et tous les chunks vectoriels associés seront supprimés.
                Cette action est <strong>irréversible</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isDeleting}
                className="border-med-border-default hover:bg-med-bg-surface-hover"
              >
                Retour
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting || !isProfessor}
                className="gap-2 bg-med-rose text-white hover:bg-med-rose/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : !isProfessor ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {!isProfessor ? "Réservé aux professeurs" : "Supprimer définitivement"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
