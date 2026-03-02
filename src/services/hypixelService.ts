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

export interface HypixelServiceError {
  message: string;
  status?: number;
}

class HypixelService {
  private static instance: HypixelService;
  private baseUrl: string;

  private constructor() {
    const apiTarget = import.meta.env.VITE_API_TARGET || "https://api.skyshards.com";
    this.baseUrl = import.meta.env.DEV ? "/api" : apiTarget;
  }

  public static getInstance(): HypixelService {
    if (!HypixelService.instance) {
      HypixelService.instance = new HypixelService();
    }
    return HypixelService.instance;
  }

  /**
   * Fetch player profile data from Hypixel API
   * @param username Minecraft username
   * @returns Profile data including shards and attributes
   */
  async fetchPlayerProfile(username: string): Promise<HypixelProfileResponse> {
    const response = await fetch(`${this.baseUrl}/skyshards/profile/${encodeURIComponent(username)}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.detail || `Failed to fetch profile: ${response.status}`;
      throw new Error(message);
    }

    return response.json();
  }
}

export const hypixelService = HypixelService.getInstance();
export default HypixelService;
