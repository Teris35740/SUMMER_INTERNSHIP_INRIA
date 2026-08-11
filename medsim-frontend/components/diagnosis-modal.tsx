"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Check } from "lucide-react";

interface DiagnosisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (diagnosis: string) => void;
}

export function DiagnosisModal({
  open,
  onOpenChange,
  onSubmit,
}: DiagnosisModalProps) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue("");
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-med-bg-surface border-med-border-default sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-med-text-primary">
            <CheckCircle size={20} className="text-med-emerald" />
            Proposer un Diagnostic
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm text-med-text-secondary mb-3">
            Quel est votre diagnostic pour ce patient ?
          </p>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Lombalgie aiguë, Appendicite..."
            autoComplete="off"
            autoFocus
            className="w-full px-4 py-2.5 rounded-lg bg-med-bg-secondary border border-med-border-default
                       text-sm text-med-text-primary placeholder:text-med-text-muted
                       focus:outline-none focus:border-med-border-focus focus:ring-1 focus:ring-med-sky/30
                       transition-colors duration-150"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-med-bg-surface border-med-border-subtle text-med-text-secondary
                       hover:bg-med-bg-surface-hover hover:text-med-text-primary cursor-pointer"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="bg-med-emerald text-med-text-inverse hover:bg-med-emerald/90
                       disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Check size={16} className="mr-1.5" />
            Soumettre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
