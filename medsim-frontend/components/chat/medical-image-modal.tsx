"use client";

import { useEffect, useState } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ImageIcon,
  Maximize2,
  FileText,
} from "lucide-react";
import type { RevealedImage } from "@/types/api";

interface MedicalImageModalProps {
  image: RevealedImage | null;
  onClose: () => void;
}

export function MedicalImageModal({ image, onClose }: MedicalImageModalProps) {
  const [zoom, setZoom] = useState(1);

  // Reset zoom whenever image changes
  useEffect(() => {
    setZoom(1);
  }, [image]);

  // Keyboard shortcut: Escape to close, +/- for zoom
  useEffect(() => {
    if (!image) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        setZoom((z) => Math.min(3, z + 0.25));
      } else if (e.key === "-") {
        setZoom((z) => Math.max(0.5, z - 0.25));
      } else if (e.key === "0") {
        setZoom(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-med-bg-elevated border border-med-border-default rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-card-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-med-border-default bg-med-bg-surface/80 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-med-sky-subtle text-med-sky border border-med-sky/30 shadow-xs shrink-0">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-med-text-primary truncate">
                  {image.description || image.file_name}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-med-sky-subtle text-med-sky border border-med-sky/30 shrink-0">
                  {image.image_type}
                </span>
              </div>
              <span className="text-[0.65rem] text-med-text-muted truncate block">
                {image.file_name} {image.fact_id ? `• Réf. fait : ${image.fact_id}` : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-med-bg-secondary p-1 rounded-xl border border-med-border-default mr-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-1.5 rounded-lg text-med-text-muted hover:text-med-text-primary hover:bg-med-bg-surface transition-colors"
                title="Dézoomer (-)"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] font-mono px-1.5 text-med-text-secondary min-w-[38px] text-center font-bold">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                className="p-1.5 rounded-lg text-med-text-muted hover:text-med-text-primary hover:bg-med-bg-surface transition-colors"
                title="Zoomer (+)"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="p-1.5 rounded-lg text-med-text-muted hover:text-med-text-primary hover:bg-med-bg-surface transition-colors"
                title="Réinitialiser (0)"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Download */}
            <a
              href={image.url}
              download={image.file_name}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-med-text-muted hover:text-med-text-primary hover:bg-med-bg-secondary transition-colors"
              title="Télécharger l'image"
            >
              <Download className="h-4 w-4" />
            </a>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-med-text-muted hover:text-med-rose hover:bg-med-rose-subtle transition-colors"
              title="Fermer (Échap)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Viewport Image */}
        <div className="relative flex-1 overflow-auto bg-black/90 p-4 sm:p-6 flex items-center justify-center min-h-[300px] max-h-[65vh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.description || image.file_name}
            className="max-h-[60vh] w-auto max-w-full object-contain transition-transform duration-200 shadow-2xl rounded-lg select-none"
            style={{ transform: `scale(${zoom})` }}
          />
        </div>

        {/* Modal Footer with clinical info */}
        {image.description && (
          <div className="px-4 sm:px-6 py-3 border-t border-med-border-default bg-med-bg-surface/90 flex items-start gap-2.5">
            <FileText className="h-4 w-4 text-med-sky shrink-0 mt-0.5" />
            <div>
              <span className="text-[0.62rem] font-bold uppercase tracking-wider text-med-text-muted block">
                Conclusion clinique de l&apos;examen
              </span>
              <p className="text-xs text-med-text-primary font-medium leading-relaxed mt-0.5">
                {image.description}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
