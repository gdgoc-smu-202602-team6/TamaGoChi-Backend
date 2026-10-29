import type { PushMessage } from '../../../foundation/push/push-sender.js';
import type { Application } from './application.js';

/** The push message telling an applicant how their application was decided. */
export function decidedMessage(application: Application): PushMessage {
  const approved = application.state === 'APPROVED';
  return {
    userIds: [application.userId],
    title: '가입 신청 결과',
    body: approved
      ? '가입 신청이 승인됐어요. 이제 동아리를 이용할 수 있어요!'
      : '가입 신청이 거절됐어요.',
    link: approved
      ? `clubs/${application.clubId}`
      : `clubs/${application.clubId}/applications/${application.id}`,
  };
}
