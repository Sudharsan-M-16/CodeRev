"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Initialize PostHog
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        person_profiles: "identified_only", // or 'always' to create profiles for anonymous users as well
        capture_pageview: true, 
      });
    }
  }, []);

  // Identify user in PostHog when they log in via Clerk
  useEffect(() => {
    if (user && typeof window !== "undefined") {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        username: user.username,
      });
    } else if (!user && typeof window !== "undefined") {
      posthog.reset();
    }
  }, [user]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
