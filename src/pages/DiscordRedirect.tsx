import { useEffect } from "react";
import { DISCORD_INVITE_URL } from "../seo/routes";

/**
 * /discord: leaves for the SkyShards Discord invite. Cloudflare Pages answers /discord with a real
 * 301 (buildRedirects in src/seo/routes.ts); this page is what the SPA does where the shell is
 * served instead (dev, GitHub Pages), and its link is the fallback if the redirect is blocked.
 */
export const DiscordRedirect = () => {
  useEffect(() => {
    window.location.replace(DISCORD_INVITE_URL);
  }, []);

  return (
    <div className="max-w-xl mx-auto py-24 px-4 text-center text-slate-200">
      <p className="text-lg font-semibold">Taking you to Discord…</p>
      <a href={DISCORD_INVITE_URL} className="mt-2 inline-block text-sm text-purple-400 underline hover:text-purple-300">
        Open the SkyShards Discord invite
      </a>
    </div>
  );
};
