"use client";

import type { GuideState } from "@ui-registry/guide";
import { useGuide } from "@ui-registry/guide/react";
import { type ReactNode, useCallback, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/** What the dialog offers: a first start, or resuming an in-progress record. */
type Offer = "start" | "resume" | null;

export interface WelcomeDialogLabels {
  /** Resume variant: starts over from the first step. */
  restart: ReactNode;
  resume: ReactNode;
  skip: ReactNode;
  start: ReactNode;
}

const DEFAULT_LABELS: WelcomeDialogLabels = {
  start: "Start the tour",
  resume: "Resume",
  restart: "Start over",
  skip: "Skip",
};

export interface WelcomeDialogProps {
  className?: string;
  description: ReactNode;
  /** Gate it (role, feature flag…). Default `true`. */
  enabled?: boolean;
  /** Id of the guide to propose. */
  guideId: string;
  /** Button labels; English by default. */
  labels?: Partial<WelcomeDialogLabels>;
  /** Resume variant; default: `description`. */
  resumeDescription?: ReactNode;
  /** Resume variant; default: `title`. */
  resumeTitle?: ReactNode;
  title: ReactNode;
}

/**
 * Auto-start example for a `manual` guide. Once the records are hydrated, it
 * opens when the guide has no record (Start) or an in-progress one (Resume /
 * Start over). Skip records the guide as dismissed; Escape only closes the
 * dialog for this visit.
 */
export function WelcomeDialog({
  className,
  description,
  enabled = true,
  guideId,
  labels,
  resumeDescription,
  resumeTitle,
  title,
}: WelcomeDialogProps) {
  const text = { ...DEFAULT_LABELS, ...labels };
  const selectOffer = useCallback(
    (state: GuideState): Offer | "pending" => {
      if (!state.hydrated) {
        return "pending";
      }
      if (state.runs.some((run) => run.guide.id === guideId)) {
        return null;
      }
      const record = state.records[guideId] ?? null;
      if (!record) {
        return "start";
      }
      return record.status === "in-progress" ? "resume" : null;
    },
    [guideId]
  );
  const { state: offer, start, end } = useGuide(selectOffer);

  // Decided once, when the records are known: a run ending later with an
  // in-progress record (missing target, error) does not reopen the dialog.
  const [decided, setDecided] = useState<Offer | undefined>(undefined);
  const [closed, setClosed] = useState(false);
  if (decided === undefined && enabled && offer !== "pending") {
    setDecided(offer);
  }

  const open = enabled && !closed && (decided ?? null) !== null;
  const resuming = decided === "resume";

  const begin = (from: "resume" | "start") => {
    setClosed(true);
    start(guideId, { from });
  };
  const skip = () => {
    setClosed(true);
    end(guideId, "dismissed");
  };

  return (
    <AlertDialog
      onOpenChange={(next) => {
        if (!next) {
          setClosed(true);
        }
      }}
      open={open}
    >
      <AlertDialogContent className={className}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {resuming ? (resumeTitle ?? title) : title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {resuming ? (resumeDescription ?? description) : description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={skip}>{text.skip}</AlertDialogCancel>
          {resuming ? (
            <Button onClick={() => begin("start")} variant="outline">
              {text.restart}
            </Button>
          ) : null}
          <AlertDialogAction
            onClick={() => begin(resuming ? "resume" : "start")}
          >
            {resuming ? text.resume : text.start}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
