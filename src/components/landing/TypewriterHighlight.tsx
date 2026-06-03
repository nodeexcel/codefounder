"use client";

import { useEffect, useState } from "react";

const PHRASES = ["In Minutes", "Without Code", "Same Day", "24/7"];

export function TypewriterHighlight() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = PHRASES[phraseIndex];
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (displayText.length < current.length) {
            setDisplayText(current.slice(0, displayText.length + 1));
          } else {
            setTimeout(() => setIsDeleting(true), 1800);
          }
        } else {
          if (displayText.length > 0) {
            setDisplayText(displayText.slice(0, -1));
          } else {
            setIsDeleting(false);
            setPhraseIndex((i) => (i + 1) % PHRASES.length);
          }
        }
      },
      isDeleting ? 45 : 85
    );
    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, phraseIndex]);

  return (
    <span className="text-[#f97316]">
      {displayText}
      <span
        className="ml-0.5 inline-block w-[3px] animate-pulse bg-[#f97316]"
        style={{ height: "1em", verticalAlign: "text-bottom" }}
        aria-hidden
      />
    </span>
  );
}
