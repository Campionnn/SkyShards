export interface ShardOwned {
  id: string;
  name: string;
  amount: number;
  rarity: string;
}

export interface AttributeOwned {
  id: string;
  name: string;
  level: number;
}

export interface ProfileSummary {
  profile_id: string;
  cute_name: string;
  game_mode: string | null;
  last_save: number;
  selected: boolean;
}

export interface ProfileData {
  profile: ProfileSummary;
  shards: ShardOwned[];
  attributes: AttributeOwned[];
}

export interface HypixelProfileResponse {
  username: string;
  uuid: string;
  profiles: ProfileData[];
  selected_profile_id: string | null;
}

/** SkyShards backend (proxied as /api by the Vite dev server). */
const API_BASE_URL = import.meta.env.DEV ? "/api" : import.meta.env.VITE_API_TARGET || "https://api.skyshards.com";

export const hypixelService = {
  /** A player's Skyblock profiles, with owned shards and attribute levels. Throws with the backend's `detail` on failure. */
  async fetchPlayerProfile(username: string): Promise<HypixelProfileResponse> {
    const response = await fetch(`${API_BASE_URL}/skyshards/profile/${encodeURIComponent(username)}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to fetch profile: ${response.status}`);
    }

    return response.json();
  },
};
