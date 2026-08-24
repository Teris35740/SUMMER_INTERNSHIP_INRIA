"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Upload, File as FileIcon, X } from "lucide-react";

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => Promise<void>;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  onUpload,
}: UploadDocumentDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      onOpenChange(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
      } else {
        alert("Veuillez sélectionner un fichier PDF.");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
      } else {
        alert("Veuillez déposer un fichier PDF.");
      }
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      await onUpload(selectedFile);
      handleClose();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass sm:max-w-[520px] border-med-border-default">
        {/* Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-med-bg-primary/80 backdrop-blur-sm rounded-2xl">
            <div className="text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-med-sky-subtle flex items-center justify-center">
                <Loader2 className="h-7 w-7 text-med-sky animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold text-med-text-primary">
                  Upload en cours...
                </p>
                <p className="text-xs text-med-text-secondary mt-1">
                  Ingestion vectorielle du dossier patient.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-med-text-primary font-heading">
            <FileText className="h-5 w-5 text-med-sky" />
            Ajouter un dossier médical
          </DialogTitle>
          <DialogDescription className="text-med-text-secondary">
            Déposez un dossier patient au format PDF pour l'ingérer dans la base de données vectorielle.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {!selectedFile ? (
            <div
              className="border-2 border-dashed border-med-border-strong rounded-xl p-8 flex flex-col items-center justify-center bg-med-bg-surface/50 hover:bg-med-bg-surface-hover transition-colors cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 rounded-full bg-med-sky-subtle flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="h-6 w-6 text-med-sky" />
              </div>
              <p className="text-sm font-medium text-med-text-primary">
                Cliquez ou glissez un fichier PDF ici
              </p>
              <p className="text-xs text-med-text-muted mt-2">
                Format supporté : PDF
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-med-sky-subtle/30 border border-med-sky/20 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-lg bg-med-sky-subtle flex items-center justify-center shrink-0">
                  <FileIcon className="h-5 w-5 text-med-sky" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-med-text-primary truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-med-text-secondary">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} Mo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="p-2 rounded-full hover:bg-med-bg-secondary text-med-text-muted hover:text-med-rose transition-colors"
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
            className="border-med-border-default hover:bg-med-bg-surface-hover"
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleConfirmUpload}
            disabled={!selectedFile || isUploading}
            className="gap-2 bg-med-sky text-white hover:bg-med-sky-hover transition-colors"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload et Ingestion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
