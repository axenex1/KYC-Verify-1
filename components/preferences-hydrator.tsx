"use client";

import { useEffect } from "react";
import { usePreferencesStore } from "@/lib/preferences/store";

export function PreferencesHydrator() {
  const hydrate = usePreferencesStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return null;
}
