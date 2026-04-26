"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ScheduleAutoProcessorProps = {
  enabled: boolean;
};

export function ScheduleAutoProcessor({ enabled }: ScheduleAutoProcessorProps) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let disposed = false;

    async function processDuePosts() {
      const response = await fetch("/api/scheduled-posts/process-due", {
        method: "POST",
      });

      if (!response.ok || disposed) {
        return;
      }

      const payload = (await response.json()) as {
        data?: { processed?: number; attempted?: number };
      };

      if ((payload.data?.processed ?? 0) > 0 || (payload.data?.attempted ?? 0) > 0) {
        router.refresh();
      }
    }

    processDuePosts().catch(() => undefined);
    const interval = window.setInterval(() => {
      processDuePosts().catch(() => undefined);
    }, 45000);

    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [enabled, router]);

  return null;
}
