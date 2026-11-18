import {
  type components,
  memberRoleValues,
  permissionValues,
} from '../../../../foundation/contract/openapi.js';
import type { Permission } from '../access/permission.js';

/** 운영진(MANAGER) or 부원(MEMBER) in one club (A-50). The values are the contract's. */
export type MemberRole = components['schemas']['MemberRole'];

const permissionsByRole: Readonly<Record<MemberRole, ReadonlySet<Permission>>> =
  {
    MANAGER: new Set(permissionValues),
    MEMBER: new Set(),
  };

export const MemberRole = {
  /** The role of whoever creates a club (C-16). */
  onCreate: 'MANAGER',
  /** The role of an approved applicant (A-06). */
  onJoin: 'MEMBER',

  permissionsOf(role: MemberRole): ReadonlySet<Permission> {
    return permissionsByRole[role];
  },

  /** The roles that hold `permission`. */
  holding(permission: Permission): MemberRole[] {
    return memberRoleValues.filter((role) =>
      permissionsByRole[role].has(permission),
    );
  },
} as const;
