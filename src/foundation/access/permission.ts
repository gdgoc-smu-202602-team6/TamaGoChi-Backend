/**
 * What a club member may do beyond being a member. The list is code; which role has which permission is data.
 * Keys are `<resource>.<action>` and span domains (club, notice), so the list lives below them.
 */
export const permissions = [
  'club.update',
  'parts.manage',
  'noticeCategories.manage',
  'applications.decide',
  'members.manage',
  'notices.write',
] as const;

export type Permission = (typeof permissions)[number];

export function isPermission(value: string): value is Permission {
  return (permissions as readonly string[]).includes(value);
}
