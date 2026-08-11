import { z } from "zod";
import { UISnapshotSchema, DigestSchema } from "./snapshot.js";
import { StepSchema, ExpectedAfterSchema } from "./steps.js";

export const MessageTypeSchema = z.enum(["HELLO","ASK","SNAPSHOT","STEP_RESULT","EVENT",
  "RESUME","STEP","STATUS","REQUEST_SNAPSHOT","TIEBREAK","SESSION_END","ERROR","PING","PONG"]);
export type MessageType = z.infer<typeof MessageTypeSchema>;

export const HelloPayload = z.object({ adapter: z.literal("chrome-extension"),
  protocol: z.literal(1), capabilities: z.array(z.string()) });
export const AskPayload = z.object({ text: z.string().min(1), digest: DigestSchema,
  mouse: z.object({ x: z.number(), y: z.number() }) });
export const SnapshotPayload = z.object({ snapshot: UISnapshotSchema,
  scope: z.enum(["full","region"]).default("full") });
export const StepResultPayload = z.object({ stepIndex: z.number().int(),
  pass: z.boolean(), observed: z.string().default("") });
export const EventPayload = z.object({
  kind: z.enum(["click","type","scroll","visibility","interrupt","next-chip","feedback","suspicious-page"]),
  elementId: z.string().optional(), detail: z.string().default("") });
export const ResumePayload = z.object({ sessionId: z.string() });
export const StepMsgPayload = z.object({ step: StepSchema, totalSteps: z.number().int() });
export const StatusPayload = z.object({ state: z.enum(["thinking","checking","rerouting","paused","found-it"]) });
export const RequestSnapshotPayload = z.object({ scope: z.enum(["full","region"]),
  region: z.string().optional() });
export const SessionEndPayload = z.object({
  outcome: z.enum(["done","stopped","expired","gave-up"]), message: z.string(),
  recap: z.array(z.string()).default([]) });
export const ErrorPayload = z.object({ code: z.string(), message: z.string() });

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
