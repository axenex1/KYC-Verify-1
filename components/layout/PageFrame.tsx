import type { ReactNode } from "react";

type PageFrameProps = {
  children: ReactNode;
  className?: string;
};

export function PageBleed({ children, className = "" }: PageFrameProps) {
  return (
    <div className={`min-h-[calc(100dvh-4rem)] ${className}`}>
      <div className="mx-auto w-full max-w-[1400px] px-5 pb-16 pt-6 md:px-10 md:pt-8">{children}</div>
    </div>
  );
}

export function PageRail({
  rail,
  children,
}: {
  rail: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto grid w-full max-w-[1400px] gap-10 px-5 pb-16 pt-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-16 md:px-10 md:pt-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="md:sticky md:top-24 md:self-start">{rail}</aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function PageDesk({ children }: PageFrameProps) {
  return (
    <div className="min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-10 md:px-12 md:pt-16">{children}</div>
    </div>
  );
}

export function PageNarrow({ children }: PageFrameProps) {
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-zinc-950">
      <div className="mx-auto w-full max-w-xl px-6 pb-20 pt-10 md:px-0 md:pt-16">{children}</div>
    </div>
  );
}
