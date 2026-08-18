export const INVITE_PREFIX = "/invite/";

export function inviteUrl(token: string): string {
  return `${window.location.origin}${INVITE_PREFIX}${token}`;
}
