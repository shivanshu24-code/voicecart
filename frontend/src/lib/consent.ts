/** Change this when the policy changes, and everyone is asked to agree again. */
export const PRIVACY_VERSION = "2026-11-06";

type UserWithMetadata = { user_metadata?: Record<string, unknown> };

export const hasAcceptedPrivacy = (user: UserWithMetadata) =>
  user.user_metadata?.privacy_version === PRIVACY_VERSION;
