import { z } from "zod";

export const TargetDescriptorSchema = z.object({
  role: z.string(), name: z.string(), nearText: z.string().optional(),
  region: z.enum(["top","bottom","left","right","center"]).optional(),
});
export type TargetDescriptor = z.infer<typeof TargetDescriptorSchema>;

export const ExpectedAfterSchema = z.object({
  kind: z.enum(["element-visible","element-focused","url-changed","dialog-appeared","value-filled"]),
  descriptor: TargetDescriptorSchema.optional(),
});
export type ExpectedAfter = z.infer<typeof ExpectedAfterSchema>;

export const StepActionSchema = z.enum(["click","type","hover","focus","press-key","scroll","wait","narrate"]);
export type StepAction = z.infer<typeof StepActionSchema>;

export const StepSchema = z.object({
  index: z.number().int().min(0), action: StepActionSchema,
  targetId: z.string().optional(), target: TargetDescriptorSchema.optional(),
  instruction: z.string().min(1), why: z.string().min(1),
  expectedAfter: ExpectedAfterSchema.optional(),
  render: z.enum(["full","minimal","none"]).default("full"),
  /** Phase 1H (§22a) + 1I (§22b): step anchors to the user's live selection
   *  Range, or to the live element the mouse rested on at ask time, instead
   *  of a snapshot id. Optional — explain-mode narrate steps only. */
  anchor: z.enum(["selection", "pointer"]).optional(),
  /** PART 4a (§L2): the destination this step would send the user to, when the
   *  step is a navigation. ADDITIVE and optional — protocol stays v1. It exists
   *  so `screenPlan`'s cross-origin rule has a field to read: zod strips unknown
   *  keys, so without it a model-supplied `href` would be silently deleted by
   *  `PlanSchema.safeParse` and the rule would be permanently dead code.
   *  Advisory, not authoritative — nothing executes it (the adapter acts on
   *  `targetId`), and the snapshot carries no link destinations yet. */
  href: z.string().optional(),
});
export type Step = z.infer<typeof StepSchema>;

export const PlanSchema = z.object({
  mode: z.enum(["guide","explain"]),
  steps: z.array(StepSchema).min(1),
  goalEvidence: ExpectedAfterSchema.optional(),
  prerequisites: z.array(z.string()).default([]),
});
export type Plan = z.infer<typeof PlanSchema>;

export const RequestRegionSchema = z.object({ request_region: z.string().min(1) });
export type RequestRegion = z.infer<typeof RequestRegionSchema>;
