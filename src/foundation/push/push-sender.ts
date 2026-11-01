import type { Id } from '../id/id.js';

/** A push message to some users' devices. Each domain writes its own messages. */
export interface PushMessage {
  readonly userIds: readonly Id<'User'>[];
  readonly title: string;
  /** The text in full; a sender shortens it to fit its transport's limit (FCM: 4KB of payload). */
  readonly body: string;
  /** The screen the app opens, e.g. `club/<id>/applications/<id>`. */
  readonly link: string;
}

/** How a message went: the devices it did not reach. */
export interface PushOutcome {
  readonly failed: number;
}

/** Delivers push messages. The account domain implements it, since it owns the device tokens. */
export abstract class PushSender {
  /** Best effort: failures are counted in the outcome and logged, never thrown at the caller. */
  abstract send(message: PushMessage): Promise<PushOutcome>;
}
