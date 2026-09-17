import { Info, Stethoscope, User, GraduationCap, Maximize2, ImageIcon } from "lucide-react";
import type {
  ChatMessage,
  PedagogicalMessage,
  DisplayMessage,
  RevealedImage,
} from "@/types/api";

// ── Helpers ──

function formatMarkdown(text: string): string {
  let result = text;
  // Bold **text**
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic *text*
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Line breaks
  result = result.replace(/\n/g, "<br />");
  return result;
}

// ── Chat Message Bubble ──

function ChatBubble({
  message,
  onSelectImage,
}: {
  message: ChatMessage;
  onSelectImage?: (image: RevealedImage) => void;
}) {
  if (message.sender === "system") {
    return (
      <div className="flex items-start gap-2.5 animate-message-in max-w-[780px] w-full mx-auto justify-center mb-2">
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-full glass border border-med-border-subtle text-[0.8rem] text-med-text-secondary font-medium">
          <Info size={16} className="text-med-sky shrink-0" />
          <span>{message.text}</span>
        </div>
      </div>
    );
  }

  if (message.sender === "user") {
    return (
      <div className="flex items-end gap-3 animate-message-in max-w-[780px] w-full mx-auto justify-end group">
        <div className="flex flex-col items-end">
          <div className="px-5 py-3.5 rounded-[24px] rounded-br-sm bg-gradient-user-msg text-white text-sm leading-relaxed max-w-[600px] shadow-md border border-white/10">
            {message.text}
          </div>
          <span className="text-[0.65rem] text-med-text-muted mt-1.5 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {message.timestamp}
          </span>
        </div>
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-med-sky/10 text-med-sky shrink-0 shadow-sm border border-med-sky/20">
          <Stethoscope size={18} />
        </div>
      </div>
    );
  }

  // Assistant
  return (
    <div className="flex items-end gap-3 animate-message-in max-w-[780px] w-full mx-auto group">
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-med-bg-surface border border-med-border-default text-med-text-secondary shrink-0 shadow-sm">
        <User size={18} />
      </div>
      <div className="min-w-0 max-w-[600px]">
        <div
          className="px-5 py-3.5 rounded-[24px] rounded-bl-sm glass text-sm text-med-text-primary leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatMarkdown(message.text) }}
        />

        {/* Attached medical images */}
        {message.images && message.images.length > 0 && (
          <div className="mt-2.5 space-y-2">
            {message.images.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => onSelectImage?.(img)}
                className="w-full flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-med-bg-surface/90 hover:bg-med-bg-surface-hover border border-med-border-default hover:border-med-sky/50 transition-all text-left shadow-xs hover:shadow-md group/img cursor-pointer"
              >
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-black/40 border border-med-border-default shrink-0 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.description || img.file_name}
                    className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover/img:bg-transparent transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-med-sky-subtle text-med-sky border border-med-sky/30">
                      {img.image_type}
                    </span>
                    <span className="text-[0.65rem] text-med-text-muted truncate">
                      {img.file_name}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-med-text-primary line-clamp-1">
                    {img.description || "Consulter le cliché médical"}
                  </p>
                  <span className="text-[0.68rem] text-med-sky font-medium flex items-center gap-1 mt-0.5 group-hover/img:underline">
                    <Maximize2 size={11} />
                    <span>Agrandir le cliché</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <span className="text-[0.65rem] text-med-text-muted mt-1.5 ml-2 block opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {message.timestamp}
        </span>
      </div>
    </div>
  );
}

// ── Pedagogical Feedback ──

function PedagogicalBubble({ message }: { message: PedagogicalMessage }) {
  return (
    <div className="flex items-end gap-3 animate-message-in max-w-[780px] w-full mx-auto group">
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-med-violet-subtle text-med-violet shrink-0 shadow-sm border border-med-violet/20">
        <GraduationCap size={18} />
      </div>
      <div className="flex-1 max-w-[650px]">
        <div className="rounded-[20px] rounded-bl-sm glass-panel overflow-hidden border-med-violet/20">
          {/* Header */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-med-border-subtle bg-med-violet/5">
            <GraduationCap size={18} className="text-med-violet" />
            <span className="text-sm font-bold text-med-violet tracking-tight">
              Évaluation Pédagogique
            </span>
          </div>

          {/* Pertinence */}
          <div className="px-5 py-4 border-b border-med-border-subtle">
            <h4 className="text-[0.7rem] font-bold text-med-text-secondary uppercase tracking-widest mb-2">
              Pertinence de la question
            </h4>
            <p className="text-sm text-med-text-primary">
              <strong
                className={
                  message.evaluation.is_pertinent
                    ? "text-med-emerald"
                    : "text-med-rose"
                }
              >
                {message.evaluation.is_pertinent
                  ? "Pertinent"
                  : "Non pertinent"}
              </strong>{" "}
              : {message.evaluation.feedback}
            </p>
          </div>

          {/* Synthesis */}
          {message.synthesis && (
            <div className="px-5 py-4 bg-med-bg-surface/30">
              <h4 className="text-[0.7rem] font-bold text-med-text-secondary uppercase tracking-widest mb-2">
                Revue de cours rapide
              </h4>
              <div
                className="text-sm text-med-text-primary leading-relaxed opacity-90"
                dangerouslySetInnerHTML={{
                  __html: formatMarkdown(message.synthesis),
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Exported Component ──

interface MessageBubbleProps {
  message: DisplayMessage;
  onSelectImage?: (image: RevealedImage) => void;
}

export function MessageBubble({ message, onSelectImage }: MessageBubbleProps) {
  if ("type" in message && message.type === "pedagogical") {
    return <PedagogicalBubble message={message as PedagogicalMessage} />;
  }

  // Diagnosis messages are handled by DiagnosisCard
  if ("type" in message && message.type === "diagnosis") {
    return null;
  }

  return (
    <ChatBubble
      message={message as ChatMessage}
      onSelectImage={onSelectImage}
    />
  );
}

