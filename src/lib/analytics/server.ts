import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

export function getPostHogClient() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    });
  }
  
  return posthogClient;
}

/**
 * Server-side wrapper for tracking critical events (e.g. AI usage, API ingestions)
 * ensuring they aren't blocked by ad-blockers on the frontend.
 */
export function trackServerEvent(
  distinctId: string, 
  eventName: string, 
  properties?: Record<string, any>
) {
  const client = getPostHogClient();
  if (!client) return;

  client.capture({
    distinctId,
    event: eventName,
    properties,
  });
}
