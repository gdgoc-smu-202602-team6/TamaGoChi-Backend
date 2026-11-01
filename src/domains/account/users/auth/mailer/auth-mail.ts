/** One mail better-auth asks the account to send: what it says, in text and in HTML. */
export interface AuthMail {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

const escape = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

function mail(
  subject: string,
  lines: readonly string[],
  url: string,
): AuthMail {
  return {
    subject,
    text: [...lines, '', url].join('\n'),
    html: [
      ...lines.map((line) => `<p>${escape(line)}</p>`),
      `<p><a href="${escape(url)}">${escape(url)}</a></p>`,
    ].join('\n'),
  };
}

/** The mails of sign-up and password reset (merged 3.2). */
export const authMails = {
  verification: (url: string) =>
    mail(
      '[다마GoC치] 이메일 인증',
      [
        '다마GoC치에 가입해 주셔서 고맙습니다.',
        '아래 링크를 열면 이메일 인증이 끝나고 로그인할 수 있습니다.',
      ],
      url,
    ),
  passwordReset: (url: string) =>
    mail(
      '[다마GoC치] 비밀번호 재설정',
      [
        '비밀번호 재설정을 요청하셨습니다.',
        '아래 링크에서 새 비밀번호를 정해 주세요. 요청하지 않으셨다면 이 메일은 무시하셔도 됩니다.',
      ],
      url,
    ),
};
