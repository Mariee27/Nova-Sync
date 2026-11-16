"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PartyPopper } from "lucide-react";
import { useReadyWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";

const COLORS = ["#2563EB", "#8B5CF6", "#10B981", "#F59E0B", "#EC4899"];
/** Deterministic pseudo-random in [0, 1) so renders stay pure. */
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const PIECES = Array.from({ length: 70 }, (_, i) => ({
  id: i,
  x: (rand(i, 1) - 0.5) * 900,
  y: -(rand(i, 2) * 520 + 160),
  r: rand(i, 3) * 540 - 270,
  delay: rand(i, 4) * 0.25,
  color: COLORS[i % COLORS.length],
  w: 6 + rand(i, 5) * 6,
}));

/** A tasteful, one-off celebration when a project reaches 100%. */
export function Celebration() {
  const { celebrating, clearCelebration, ws } = useReadyWorkspace();
  const reduce = useReducedMotion();
  const project = ws.projects.find((p) => p.id === celebrating);
  const pieces = PIECES;

  React.useEffect(() => {
    if (!celebrating) return;
    const t = setTimeout(clearCelebration, 6500);
    return () => clearTimeout(t);
  }, [celebrating, clearCelebration]);

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/20 p-4 backdrop-blur-[1px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={clearCelebration}
        >
          {!reduce && (
            <div className="pointer-events-none absolute top-1/2 left-1/2">
              {pieces.map((p) => (
                <motion.span
                  key={p.id}
                  className="absolute block rounded-[2px]"
                  style={{ background: p.color, width: p.w, height: p.w * 0.45 }}
                  initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                  animate={{ x: p.x, y: [0, p.y, p.y + 700], rotate: p.r, opacity: [1, 1, 0] }}
                  transition={{ duration: 2.6, delay: p.delay, ease: [0.16, 1, 0.3, 1], times: [0, 0.35, 1] }}
                />
              ))}
            </div>
          )}
          <motion.div
            role="alertdialog"
            aria-label="Project completed"
            className="relative w-full max-w-sm rounded-3xl border bg-card p-7 text-center shadow-lift"
            initial={{ scale: 0.9, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-[0_12px_30px_-10px_rgb(37_99_235/0.6)]">
              <PartyPopper className="size-7" />
            </div>
            <p className="text-xs font-semibold tracking-wider text-primary uppercase">100% complete</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">{project.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Every task is done. That&apos;s what working in sync looks like — better together.</p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="outline" onClick={clearCelebration}>Close</Button>
              <Button asChild onClick={clearCelebration}>
                <Link href={`/projects/${project.id}`}>View project</Link>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
