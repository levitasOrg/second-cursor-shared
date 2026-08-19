import { z } from "zod";

/** A hostname, never a full URL: URLs carry tokens, record ids and queries. */
const HostnameSchema = z.string().min(1).max(253)
  .refine((s) => !s.includes("/") && !s.includes(":") && !s.includes("?"),
    { message: "hostname only — never a full URL" });

/** Free text is NEVER stored open. Everything in here is sealed by the brain
 *  before it touches disk; the schema groups it so that is unmissable. */
export const FreeTextSchema = z.object({
  errorMessage: z.string().max(2000).optional(),
  errorStack: z.string().max(8000).optional(),
  note: z.string().max(500).optional(),
  logs: z.array(z.object({
    ts: z.number(), level: z.enum(["debug", "info", "warn", "error"]),
    src: z.string().max(40), msg: z.string().max(500),
  })).max(200).default([]),
}).strict();

/** The extension's half: ONLY what the brain cannot already infer. Strict, so
 *  a new open field is a schema error rather than a silent leak. */
export const ClientDeltaSchema = z.object({
  kind: z.enum(["crash", "render-mismatch", "struggle", "manual"]),
  /** The user's one-tap answer to "what happened?" on the preview. An enum so
   *  reports stay countable without unsealing anything; anything they *write*
   *  goes in freeText.note and is sealed. */
  category: z.enum(["wrong-element", "no-advance", "too-slow", "cant-exit", "other"]).optional(),
  fingerprint: z.string().min(1).max(64),
  app: HostnameSchema.optional(),
  ext: z.object({ version: z.string().max(20), browser: z.string().max(20) }).strict(),
  settings: z.object({
    clickEmphasis: z.string().max(20), explainPointer: z.string().max(20),
    tooltipMode: z.string().max(20), elderly: z.boolean(), skin: z.string().max(20),
  }).strict(),
  /** Error CLASS only — the message and stack are free text and sealed. */
  errorName: z.string().max(60).optional(),
  render: z.object({
    targetResolved: z.boolean(), targetVisible: z.boolean(),
    surfaceMounted: z.enum(["tooltip", "dock", "pill", "none"]),
    placement: z.enum(["right", "left", "above", "below", "none"]),
  }).strict().optional(),
  freeText: FreeTextSchema.optional(),
}).strict();
export type ClientDelta = z.infer<typeof ClientDeltaSchema>;

export const SealedBlobSchema = z.object({
  keyId: z.string(), ephemeralPublicKey: z.string(),
  iv: z.string(), ciphertext: z.string(),
}).strict();
export type SealedBlob = z.infer<typeof SealedBlobSchema>;

export const SessionTraceSchema = z.object({
  sessionId: z.string(), createdAt: z.number(),
  platform: z.enum(["extension", "desktop", "android"]),
  outcome: z.enum(["gave-up", "expired", "provider-error", "max-reroutes", "client-only"]),
  brain: z.object({
    state: z.string(), stepIndex: z.number().int(), totalSteps: z.number().int(),
    tier: z.number().int(), model: z.string().max(60), llmCalls: z.number().int(),
    rerouteCount: z.number().int(),
    plan: z.array(z.object({
      index: z.number().int(), action: z.string().max(20),
      targetId: z.string().max(40).nullable(), render: z.string().max(10),
    })).optional(),
    providerError: z.object({
      vendor: z.string().max(20), status: z.number().int(), message: z.string().max(300),
    }).optional(),
  }).strict(),
  client: ClientDeltaSchema.omit({ freeText: true }).optional(),
  /** Sealed SEPARATELY per half: the server holds no private key, so it cannot
   *  open-merge-reseal two payloads into one. A single column meant whichever
   *  half wrote last destroyed the other's free text. */
  sealedBrain: SealedBlobSchema.optional(),
  sealedClient: SealedBlobSchema.optional(),
}).strict();
export type SessionTrace = z.infer<typeof SessionTraceSchema>;
