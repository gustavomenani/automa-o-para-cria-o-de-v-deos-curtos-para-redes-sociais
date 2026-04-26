"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type ManusSyncMonitorProps = {
  contentId: string;
  active: boolean;
};

export function ManusSyncMonitor({ contentId, active }: ManusSyncMonitorProps) {
  const router = useRouter();
  const busyRef = useRef(false);

  useEffect(() => {
    if (!active) {
      return;
    }

    const sync = async () => {
      if (busyRef.current) {
        return;
      }

      busyRef.current = true;

      try {
        const response = await fetch(`/api/content-projects/${contentId}/sync-manus`, {
          method: "POST",
        });

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as { completed?: boolean };

        if (result.completed) {
          router.refresh();
        }
      } finally {
        busyRef.current = false;
      }
    };

    sync();
    const intervalId = window.setInterval(sync, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [active, contentId, router]);

  return null;
}
