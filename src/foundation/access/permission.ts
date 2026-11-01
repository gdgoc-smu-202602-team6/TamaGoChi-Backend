import { type components, permissionValues } from '../contract/openapi.js';

/**
 * What a club member may do beyond being a member. The list is the contract's; which role has which permission is
 * data. Keys are `<resource>.<action>` and span domains (club, notice), so the list lives below them.
 */
const permissions = permissionValues;

export type Permission = components['schemas']['Permission'];

export function isPermission(value: string): value is Permission {
  return (permissions as readonly string[]).includes(value);
}
