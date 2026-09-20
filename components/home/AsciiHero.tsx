"use client";

import { useEffect, useState, type ComponentType } from "react";

type AsciiProps = {
  text?: string;
  asciiFontSize?: number;
  textFontSize?: number;
  textColor?: string;
  planeBaseHeight?: number;
  enableWaves?: boolean;
};

export function AsciiHero({
  text,
  reduce,
}: {
  text: string;
  reduce: boolean | null;
}) {
  const [Ascii, setAscii] = useState<ComponentType<AsciiProps> | null>(null);

  useEffect(() => {
    if (reduce) return;
    let cancelled = false;
    void import("@/components/ui/ascii-text").then((mod) => {
      if (!cancelled) setAscii(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, [reduce]);

  if (reduce || !Ascii) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-6xl font-semibold tracking-[-0.08em] text-red-300 md:text-8xl">
        {text}
      </div>
    );
  }

  return (
    <Ascii
      text={text}
      asciiFontSize={7}
      textFontSize={220}
      textColor="#fff5f5"
      planeBaseHeight={7}
      enableWaves
    />
  );
}
