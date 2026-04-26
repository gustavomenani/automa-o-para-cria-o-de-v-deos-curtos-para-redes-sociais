"use client";

import { useEffect } from "react";

const STORAGE_KEY = "short-video.default-social-accounts";

type StoredDefaults = Partial<Record<"INSTAGRAM" | "TIKTOK" | "YOUTUBE", string>>;

function readDefaults(): StoredDefaults {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    return rawValue ? (JSON.parse(rawValue) as StoredDefaults) : {};
  } catch {
    return {};
  }
}

function saveDefaults(value: StoredDefaults) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function SocialAccountPreferenceApplier() {
  useEffect(() => {
    const defaults = readDefaults();
    const publishSelects = document.querySelectorAll<HTMLSelectElement>("[data-social-platform]");
    const cleanupHandlers: Array<() => void> = [];

    publishSelects.forEach((select) => {
      const platform = select.dataset.socialPlatform as keyof StoredDefaults | undefined;
      const preferredValue = platform ? defaults[platform] : undefined;

      if (preferredValue && Array.from(select.options).some((option) => option.value === preferredValue)) {
        select.value = preferredValue;
      }

      const handler = () => {
        if (!platform) {
          return;
        }

        const nextDefaults = {
          ...readDefaults(),
          [platform]: select.value,
        };

        saveDefaults(nextDefaults);
      };

      select.addEventListener("change", handler);
      cleanupHandlers.push(() => select.removeEventListener("change", handler));
    });

    const schedulePlatformSelect = document.getElementById("schedule-platform") as HTMLSelectElement | null;
    const scheduleAccountSelect = document.getElementById("schedule-social-account") as HTMLSelectElement | null;

    if (!schedulePlatformSelect || !scheduleAccountSelect) {
      return () => {
        cleanupHandlers.forEach((cleanup) => cleanup());
      };
    }

    const syncScheduleAccount = () => {
      const platform = schedulePlatformSelect.value as keyof StoredDefaults;
      const preferredValue = readDefaults()[platform];

      if (
        preferredValue &&
        Array.from(scheduleAccountSelect.options).some(
          (option) =>
            option.value === preferredValue && option.dataset.platform === platform,
        )
      ) {
        scheduleAccountSelect.value = preferredValue;
      }
    };

    syncScheduleAccount();
    schedulePlatformSelect.addEventListener("change", syncScheduleAccount);

    return () => {
      cleanupHandlers.forEach((cleanup) => cleanup());
      schedulePlatformSelect.removeEventListener("change", syncScheduleAccount);
    };
  }, []);

  return null;
}
