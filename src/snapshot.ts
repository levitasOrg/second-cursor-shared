import { z } from "zod";

export const ElementStateSchema = z.enum(["visible","hidden","enabled","disabled",
  "expanded","collapsed","haspopup","focused"]);
export type ElementState = z.infer<typeof ElementStateSchema>;

export const ElementNodeSchema = z.object({
  id: z.string(), role: z.string(), name: z.string(), text: z.string().max(80),
  /** Where a link goes, HOSTNAME ONLY (see destHost). Absent for non-links and
   *  for same-origin links. L2's cross-origin rule needs a destination the page
   *  states, not one the model claims. */
  dest: z.string().max(253).optional(),
  /** The PAGE says this field takes a secret (input type=password, or an
   *  autocomplete hint naming credentials/cards). Same precedent as `dest`:
   *  L2 needs an authoritative signal — an unnamed password box defeats any
   *  name-matching rule, and a model cannot be trusted to volunteer it. */
  secret: z.literal(true).optional(),
  bounds: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  state: z.array(ElementStateSchema), parent: z.string().nullable(),
  value: z.null(), // INVARIANT: user-entered values never captured
});
export type ElementNode = z.infer<typeof ElementNodeSchema>;

export const UISnapshotSchema = z.object({
  v: z.literal(1), platform: z.literal("chrome"), app: z.string(), locale: z.string(),
  viewport: z.object({ w: z.number(), h: z.number(), scrollY: z.number() }),
  mouse: z.object({ x: z.number(), y: z.number() }),
  elements: z.array(ElementNodeSchema).max(300),
});
export type UISnapshot = z.infer<typeof UISnapshotSchema>;

export const DigestSchema = z.object({
  app: z.string(), title: z.string(), locale: z.string(),
  landmarks: z.array(z.string()).max(20), keyButtons: z.array(z.string()).max(20),
  /** Task S5: full document scrollHeight (px) so the planner knows the page
   *  extends far beyond the viewport and can request_region instead of
   *  guessing. Optional — older adapters simply omit it. */
  pageHeight: z.number().optional(),
  /** Phase 1H (§23): whole-page section map — headings + landmarks in document
   *  order so the planner knows what exists beyond the snapshot. Optional —
   *  older adapters simply omit it. */
  outline: z.array(z.object({
    kind: z.enum(["heading","landmark"]),
    level: z.number().int().min(1).max(6).optional(),
    name: z.string().max(80),
  })).max(120).optional(),
});
export type Digest = z.infer<typeof DigestSchema>;
