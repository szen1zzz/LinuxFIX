export type DeveloperGrant = { userId: string; level: 'developer' | 'admin' };

export function getDeveloperAccess(grant: DeveloperGrant | null, userId: string): DeveloperGrant['level'] | null {
  return userId && grant?.userId === userId ? grant.level : null;
}
