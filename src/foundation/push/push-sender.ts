/** A push message to some users' devices. Each domain writes its own messages. */
export interface PushMessage {
  readonly userIds: readonly string[];
  readonly title: string;
  readonly body: string;
  /** The screen the app opens, e.g. `club/<id>/applications/<id>`. */
  readonly link: string;
}

/** Delivers push messages. The account domain implements it, since it owns the device tokens. */
export abstract class PushSender {
  /** Whether it was delivered. Best effort: a failure is reported this way and logged, never thrown at the caller. */
  abstract send(message: PushMessage): Promise<boolean>;
}
