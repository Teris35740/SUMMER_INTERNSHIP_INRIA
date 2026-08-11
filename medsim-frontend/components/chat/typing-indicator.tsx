"use client";

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5 animate-message-in max-w-[780px] w-full mx-auto">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-med-bg-surface border border-med-border-subtle text-med-text-secondary shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <div>
        <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-med-bg-surface border border-med-border-subtle">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full bg-med-text-muted"
              style={{ animation: "typingBounce 1.4s ease-in-out infinite" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-med-text-muted"
              style={{
                animation: "typingBounce 1.4s ease-in-out infinite",
                animationDelay: "0.2s",
              }}
            />
            <span
              className="w-2 h-2 rounded-full bg-med-text-muted"
              style={{
                animation: "typingBounce 1.4s ease-in-out infinite",
                animationDelay: "0.4s",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
