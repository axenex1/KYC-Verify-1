"use client";

import { useEffect, useState, type ComponentType } from "react";

const STATUE = "/images/statue.png";

type ParticleImageProps = {
  imageUrl?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  children?: React.ReactNode;
  particleCount?: number;
  particleSize?: number;
  particleOpacity?: number;
  speed?: number;
  noiseScale?: number;
  noiseStrength?: number;
  damping?: number;
  lifespan?: number;
  showImage?: boolean;
  imageOpacity?: number;
  backgroundColor?: string;
  cursorInteraction?: boolean;
  cursorStrength?: number;
  cursorRadius?: number;
  dpr?: number;
  paused?: boolean;
};

export function ParticleBackdrop({
  reduce,
  className,
  imageOpacity = 0.15,
  height = "100%",
  particleCount = 120000,
}: {
  reduce: boolean | null;
  className?: string;
  imageOpacity?: number;
  height?: string | number;
  particleCount?: number;
}) {
  const [ParticleImage, setParticleImage] = useState<ComponentType<ParticleImageProps> | null>(null);

  useEffect(() => {
    if (reduce) return;
    let cancelled = false;
    void import("@/components/ui/particle-image").then((mod) => {
      if (!cancelled) setParticleImage(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, [reduce]);

  if (reduce || !ParticleImage) {
    return (
      <div
        className={className}
        style={{
          width: "100%",
          height,
          backgroundColor: "#09090b",
          backgroundImage: `url(${STATUE})`,
          backgroundSize: "cover",
          backgroundPosition: "42% 32%",
          backgroundRepeat: "no-repeat",
          opacity: imageOpacity,
        }}
      />
    );
  }

  return (
    <ParticleImage
      className={className}
      imageUrl={STATUE}
      width="100%"
      height={height}
      particleCount={particleCount}
      particleSize={2}
      particleOpacity={0.45}
      speed={0.7}
      noiseScale={0.003}
      noiseStrength={0.03}
      damping={0.97}
      lifespan={320}
      showImage
      imageOpacity={imageOpacity}
      backgroundColor="#09090b"
      cursorInteraction
      cursorStrength={0.06}
      cursorRadius={80}
      dpr={1.5}
    />
  );
}
