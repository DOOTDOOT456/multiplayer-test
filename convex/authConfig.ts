import { query } from "./_generated/server";

/**
 * Tells the client which sign-in methods are actually usable.
 * GitHub only works once CONVEX_AUTH_GITHUB_CLIENT_ID / SECRET are set on
 * the Convex deployment, so we never show a button that would fail.
 */
export const availableProviders = query({
  args: {},
  handler: async () => {
    return {
      anonymous: true,
      github: Boolean(process.env.CONVEX_AUTH_GITHUB_CLIENT_ID),
    };
  },
});
