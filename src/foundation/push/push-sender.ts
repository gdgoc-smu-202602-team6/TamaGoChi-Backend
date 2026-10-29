/** A push message to some users' devices. Each area writes its own messages. */
export interface PushMessage {
  readonly userIds: readonly string[];
  readonly title: string;
  readonly body: string;
  /** The screen the app opens, e.g. `club/<id>/applications/<id>`. */
  readonly link: string;
}

/** Delivers push messages. The account area implements it, since it owns the device tokens. */
export abstract class PushSender {
  /** Best effort: a failure is logged, never thrown at the caller. */
  abstract send(message: PushMessage): Promise<void>;
}
