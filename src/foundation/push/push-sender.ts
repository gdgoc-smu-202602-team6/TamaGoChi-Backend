/** A push message to some users' devices. Each domain writes its own messages. */
export interface PushMessage {
  readonly userIds: readonly string[];
  readonly title: string;
  /** The text in full; a sender shortens it to fit its transport's limit (FCM: 4KB of payload). */
  readonly body: string;
  /** The screen the app opens, e.g. `club/<id>/applications/<id>`. */
  readonly link: string;
}

/** How a message went: devices it reached and devices it did not. */
export interface PushOutcome {
  readonly delivered: number;
  readonly failed: number;
}

/** Delivers push messages. The account domain implements it, since it owns the device tokens. */
export abstract class PushSender {
  /** Best effort: failures are counted in the outcome and logged, never thrown at the caller. */
  abstract send(message: PushMessage): Promise<PushOutcome>;
}
