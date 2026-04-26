"use client";

import { useState } from "react";

const STORAGE_KEY = "short-video.default-social-accounts";

type SocialAccountOption = {
  id: string;
  accountName: string;
  platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "YOUTUBE_SHORTS";
  platformLabel: string;
};

type SocialAccountDefaultsProps = {
  accounts: SocialAccountOption[];
};

type DefaultSocialAccounts = Partial<Record<"INSTAGRAM" | "TIKTOK" | "YOUTUBE", string>>;

function readDefaults(): DefaultSocialAccounts {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    return rawValue ? (JSON.parse(rawValue) as DefaultSocialAccounts) : {};
  } catch {
    return {};
  }
}

function saveDefaults(value: DefaultSocialAccounts) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function SocialAccountDefaults({ accounts }: SocialAccountDefaultsProps) {
  const [defaults, setDefaults] = useState<DefaultSocialAccounts>(() => readDefaults());

  function handleChange(platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE", value: string) {
    const nextValue = {
      ...defaults,
      [platform]: value,
    };

    setDefaults(nextValue);
    saveDefaults(nextValue);
  }

  const platforms: Array<"INSTAGRAM" | "TIKTOK" | "YOUTUBE"> = ["INSTAGRAM", "TIKTOK", "YOUTUBE"];

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="font-semibold">Conta padrao por plataforma</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Essa preferencia fica salva neste navegador e preenche automaticamente os selects de publicacao.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {platforms.map((platform) => (
          <div key={platform}>
            <label htmlFor={`default-${platform}`} className="text-sm font-medium text-zinc-800">
              {platform}
            </label>
            <select
              id={`default-${platform}`}
              value={defaults[platform] ?? ""}
              onChange={(event) => handleChange(platform, event.target.value)}
              className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Nenhuma</option>
              {accounts
                .filter((account) => account.platform === platform)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountName}
                  </option>
                ))}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}
