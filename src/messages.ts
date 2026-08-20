import { z } from "zod";
import { UISnapshotSchema, DigestSchema } from "./snapshot.js";
import { StepSchema, ExpectedAfterSchema } from "./steps.js";
import { ClientDeltaSchema } from "./trace.js";

export const MessageTypeSchema = z.enum(["HELLO","ASK","SNAPSHOT","STEP_RESULT","EVENT",
  "RESUME","STEP","STATUS","REQUEST_SNAPSHOT","TIEBREAK","SESSION_END","ERROR","PING","PONG",
  "QUICK_ASKS_GET","QUICK_ASKS","TIEBREAK_PICK","STOP","REPORT","REPORT_DELETE",
  "SUGGEST_ASKS_GET","SUGGEST_ASKS"]);
export type MessageType = z.infer<typeof MessageTypeSchema>;

export const HelloPayload = z.object({ adapter: z.literal("chrome-extension"),
  protocol: z.literal(1), capabilities: z.array(z.string()),
  /** PART O1 (additive): a JWT access token. Absent = anonymous. A bad token
   *  degrades to anonymous — sign-in problems must never kill guidance. */
  token: z.string().optional(),
  /** Additive O1b field: client-minted stable id for the anonymous trial —
   *  an abuse-friction key, not identity. */
  deviceId: z.string().max(64).optional() });
export const AskPayload = z.object({ text: z.string().min(1), digest: DigestSchema,
  mouse: z.object({ x: z.number(), y: z.number() }),
  /** Phase 1H (§22a): user-highlighted text (privacy-guarded, ≤1200 chars) +
   *  its viewport bounds. Optional — present only on selection-explain asks. */
  selection: z.object({ text: z.string().max(1200),
    bounds: z.tuple([z.number(), z.number(), z.number(), z.number()]) }).optional(),
  /** Phase 1I (§22b): the snapshot element the mouse rests on at ask time —
   *  the deictic anchor for "what is this?". Optional adapter capability,
   *  like `selection`; a live selection always outranks it. */
  pointer: z.object({ elementId: z.string(), role: z.string(), name: z.string(),
    bounds: z.tuple([z.number(), z.number(), z.number(), z.number()]) }).optional() });
export const SnapshotPayload = z.object({ snapshot: UISnapshotSchema,
  scope: z.enum(["full","region"]).default("full") });
export const StepResultPayload = z.object({ stepIndex: z.number().int(),
  pass: z.boolean(), observed: z.string().default("") });
export const EventPayload = z.object({
  kind: z.enum(["click","type","scroll","visibility","interrupt","next-chip","feedback","suspicious-page","struggle"]),
  elementId: z.string().optional(), detail: z.string().default("") });
export const ResumePayload = z.object({ sessionId: z.string() });
export const StepMsgPayload = z.object({ step: StepSchema, totalSteps: z.number().int() });
export const StatusPayload = z.object({
  state: z.enum(["thinking","checking","rerouting","paused","found-it","continuing"]),
  detail: z.string().optional() });
export const RequestSnapshotPayload = z.object({ scope: z.enum(["full","region"]),
  region: z.string().optional() });
export const SessionEndPayload = z.object({
  outcome: z.enum(["done","stopped","expired","gave-up"]), message: z.string(),
  recap: z.array(z.string()).default([]), masteryNote: z.string().optional() });
export const ErrorPayload = z.object({ code: z.string(), message: z.string() });
export const QuickAsksGetPayload = z.object({ app: z.string().min(1) });
export const QuickAsksPayload = z.object({ items: z.array(z.object({
  // 8, not 3 (2026-08-20): the bar shows 3 idle and filters the rest as the
  // user types — the typeahead corpus rides the same envelope.
  question: z.string(), uses: z.number().int() })).max(8) });
export const TiebreakPickPayload = z.object({ choice: z.string() });
/** The user closed the guide. Carries no data — the intent is the message.
 *  Sent from every exit path (✕, Stop, Escape) so a session the user has
 *  dismissed stops planning and stops costing, instead of lingering until the
 *  tab TTL expires. `reason` is diagnostic only. */
export const StopPayload = z.object({
  reason: z.enum(["user-stop", "user-escape", "user-close"]).default("user-stop") });

export const EnvelopeSchema = z.object({
  v: z.literal(1), sessionId: z.string().optional(),
  type: MessageTypeSchema, payload: z.unknown(),
});
export type Envelope = z.infer<typeof EnvelopeSchema>;

const payloadSchemas: Record<string, z.ZodTypeAny> = {
  HELLO: HelloPayload, ASK: AskPayload, SNAPSHOT: SnapshotPayload,
  STEP_RESULT: StepResultPayload, EVENT: EventPayload, RESUME: ResumePayload,
  STEP: StepMsgPayload, STATUS: StatusPayload, REQUEST_SNAPSHOT: RequestSnapshotPayload,
  SESSION_END: SessionEndPayload, ERROR: ErrorPayload,
  PING: z.object({}), PONG: z.object({}), TIEBREAK: z.object({ question: z.string(),
    options: z.array(z.object({ id: z.string(), label: z.string() })).max(2) }),
  QUICK_ASKS_GET: QuickAsksGetPayload, QUICK_ASKS: QuickAsksPayload,
  TIEBREAK_PICK: TiebreakPickPayload, STOP: StopPayload, REPORT: ClientDeltaSchema,
  // Revoke: empty payload — the envelope's sessionId names the trace row to drop.
  REPORT_DELETE: z.object({}),
  // Page-aware ask suggestions (2026-08-20): summon-time, digest-only, fast tier.
  SUGGEST_ASKS_GET: z.object({ app: z.string(), digest: DigestSchema }),
  SUGGEST_ASKS: z.object({ items: z.array(z.string().max(90)).max(4) }),
};

export function parseEnvelope(raw: string): Envelope {
  const env = EnvelopeSchema.parse(JSON.parse(raw));
  const schema = payloadSchemas[env.type];
  if (!schema) throw new Error(`unknown message type ${env.type}`);
  return { ...env, payload: schema.parse(env.payload) };
}

export function makeEnvelope(type: MessageType, payload: unknown, sessionId?: string): Envelope {
  return parseEnvelope(JSON.stringify({ v: 1, sessionId, type, payload }));
}
