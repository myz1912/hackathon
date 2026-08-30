import { z } from "zod";
import { MEDIA_ROOT, resolveWithinRoot } from "./safepath.js";

const nonEmptyString = z.string().trim().min(1);
const isoTimestamp = z.iso.datetime({ offset: true });

/** Guarantees a complete, supported creative brief referencing at least one owned media path. */
export const BriefSchema = z
  .object({
    goal: nonEmptyString,
    desiredReaction: nonEmptyString,
    audience: nonEmptyString,
    platform: z.enum(["tiktok", "reels", "shorts"]),
    mediaPaths: z.array(nonEmptyString).min(1),
  })
  .strict();
export type Brief = z.infer<typeof BriefSchema>;

/** Guarantees a source-linked research observation with verbatim evidence and collection time. */
export const ResearchFindingSchema = z
  .object({
    url: z.url(),
    title: nonEmptyString,
    publisher: nonEmptyString,
    collectedAt: isoTimestamp,
    pattern: nonEmptyString,
    evidence: nonEmptyString,
  })
  .strict();
export type ResearchFinding = z.infer<typeof ResearchFindingSchema>;

/** Guarantees a provenance-carrying report whose declared source count matches its URL-bearing findings. */
export const ResearchReportSchema = z
  .object({
    findings: z.array(ResearchFindingSchema),
    query: nonEmptyString,
    collectedAt: isoTimestamp,
    sourceCount: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((report, context) => {
    if (report.sourceCount !== report.findings.length) {
      context.addIssue({
        code: "custom",
        path: ["sourceCount"],
        message: "sourceCount must equal the number of provenance-bearing findings",
      });
    }
  });
export type ResearchReport = z.infer<typeof ResearchReportSchema>;

/** Guarantees normalized media dimensions, duration, path, and audio presence. */
export const MediaProbeSchema = z
  .object({
    path: nonEmptyString,
    durationSec: z.number().positive().finite(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    hasAudio: z.boolean(),
  })
  .strict();
export type MediaProbe = z.infer<typeof MediaProbeSchema>;

const EditSegmentSchema = z
  .object({
    sourcePath: nonEmptyString,
    startSec: z.number().nonnegative().finite(),
    endSec: z.number().positive().finite(),
    reason: nonEmptyString,
  })
  .strict();

/** Guarantees a concrete hook, timed source segments, and URL citations for every edit choice. */
export const EditPlanSchema = z
  .object({
    hook: nonEmptyString,
    segments: z.array(EditSegmentSchema).min(1),
    citations: z.array(z.url()).min(1),
  })
  .strict();
export type EditPlan = z.infer<typeof EditPlanSchema>;

/** Guarantees named QA evidence and an explicit aggregate pass state. */
export const QaReportSchema = z
  .object({
    checks: z
      .array(
        z
          .object({
            name: nonEmptyString,
            pass: z.boolean(),
            detail: nonEmptyString,
          })
          .strict(),
      )
      .min(1),
    allPassed: z.boolean(),
  })
  .strict()
  .superRefine((report, context) => {
    if (report.allPassed !== report.checks.every((check) => check.pass)) {
      context.addIssue({
        code: "custom",
        path: ["allPassed"],
        message: "allPassed must match the individual checks",
      });
    }
  });
export type QaReport = z.infer<typeof QaReportSchema>;

/** Guarantees a QA-backed, copy-ready packet that can never represent an external action. */
export const PublishPacketSchema = z
  .object({
    caption: nonEmptyString,
    hashtags: z.array(nonEmptyString),
    editPlan: EditPlanSchema,
    qa: QaReportSchema,
    external_action: z.literal(false),
    readyToPublish: z.boolean(),
  })
  .strict();
export type PublishPacket = z.infer<typeof PublishPacketSchema>;

/** Validates segment timing against probed media and requires one URL citation per edit choice. */
export function validateEditPlan(
  plan: EditPlan,
  probes: readonly MediaProbe[],
  mediaRoot = MEDIA_ROOT,
): EditPlan {
  const parsedPlan = EditPlanSchema.parse(plan);
  const probeByPath = new Map(
    probes.map((probe) => {
      const parsedProbe = MediaProbeSchema.parse(probe);
      return [resolveWithinRoot(mediaRoot, parsedProbe.path), parsedProbe] as const;
    }),
  );

  if (parsedPlan.citations.length < parsedPlan.segments.length) {
    throw new Error("Each edit segment must have a citation");
  }

  for (const segment of parsedPlan.segments) {
    const resolvedSourcePath = resolveWithinRoot(mediaRoot, segment.sourcePath);
    const probe = probeByPath.get(resolvedSourcePath);
    if (!probe) {
      throw new Error(`No media probe exists for ${segment.sourcePath}`);
    }
    if (segment.endSec <= segment.startSec) {
      throw new Error(`Segment duration must be positive for ${segment.sourcePath}`);
    }
    if (segment.endSec > probe.durationSec) {
      throw new Error(`Segment exceeds media bounds for ${segment.sourcePath}`);
    }
  }

  return parsedPlan;
}
