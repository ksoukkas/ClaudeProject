/**
 * Committed batch of AI aerial readings (scripts/aerial-batch.mts writes the
 * JSON). Server-only. A missing id means "not read", never "nothing there".
 */
import data from "./data/aerial-reads.json";
import type { AerialLabel } from "./types";

export const AERIAL_LABELS: AerialLabel[] = ["vacant-lot", "parking-lot", "building-intact", "building-possibly-distressed", "unclear"];
export const isAerialLabel = (v: unknown): v is AerialLabel => AERIAL_LABELS.includes(v as AerialLabel);

export interface CommittedRead {
  label: AerialLabel;
  notes: string;
  model: string;
  readAt: string;
}

const file = data as unknown as {
  source?: { imagery?: { name: string; url: string; checkedAt: string }; caveat?: string };
  reads?: Record<string, CommittedRead>;
};

export const committedReads: Record<string, CommittedRead> = file.reads ?? {};
export const committedSource = file.source ?? {};

export function committedRead(id: string): CommittedRead | null {
  const r = committedReads[id];
  return r && isAerialLabel(r.label) ? r : null;
}
