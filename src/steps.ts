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
  /** Phase 1H (§22a): step anchors to the user's live selection Range instead
   *  of a snapshot element. Optional — only selection-explain narrate steps. */
  anchor: z.literal("selection").optional(),
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
