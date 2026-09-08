"use client";

import { MotionConfig } from "framer-motion";
import { ReactNode } from "react";

export function PublicExperience({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="public-site">{children}</div>
    </MotionConfig>
  );
}
