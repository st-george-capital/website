"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toolCatalog } from "@/lib/tool-catalog";
const defaults = ["dcf", "capital-flows", "sentiment-tool", "cvar-optimizer"];
export function useWorkspacePins() {
  const { data: session } = useSession();
  const key = `sgc:pinned-tools:${session?.user?.id || session?.user?.email || "guest"}`;
  const [pins, setPins] = useState<string[]>(defaults);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      setPins(
        Array.isArray(saved)
          ? saved.filter((id) => toolCatalog.some((t) => t.id === id))
          : defaults,
      );
    } catch {
      setPins(defaults);
    }
  }, [key]);
  const toggle = (id: string) =>
    setPins((current) => {
      const next = current.includes(id)
        ? current.filter((p) => p !== id)
        : [...current, id];
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* Keep the selection for this visit when storage is unavailable. */
      }
      return next;
    });
  return { pins, toggle };
}
