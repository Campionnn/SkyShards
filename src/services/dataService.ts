import type { BazaarData } from "../types/hypixelApiTypes.ts";
import type { ShardWithKey } from "../types/types";

export class DataService {
  private static instance: DataService;
  private shardsCache: ShardWithKey[] | null = null;
  private shardNameToKeyCache: Record<string, string> | null = null;
  private defaultRatesCache: Record<string, number> | null = null;
  private bazaarPriceCache: Record<string, Record<string, number>> | null = null;

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  private async fetchJson<T>(filename: string): Promise<T> {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}${filename}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to load ${filename}: ${error}`);
    }
  }

  private async fetchApi<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(
        `https://api.hypixel.net/v2/skyblock${endpoint}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch API endpoint ${endpoint}: ${error}`);
    }
  }

  async loadShards(): Promise<ShardWithKey[]> {
    if (this.shardsCache) {
      return this.shardsCache;
    }

    const [fusionData, defaultRates] = await Promise.all([this.fetchJson<any>("fusion-data.json"), this.loadDefaultRates()]);

    this.shardsCache = Object.entries(fusionData.shards).map(([key, shard]: [string, any]) => ({
        key,
        ...shard,
        id: key,
        rate: defaultRates[key] || 0,
    }));

    return this.shardsCache;
  }

  async getShardNameToKeyMap(): Promise<Record<string, string>> {
    if (this.shardNameToKeyCache) {
      return this.shardNameToKeyCache;
    }

    const shards = await this.loadShards();
    this.shardNameToKeyCache = shards.reduce((acc, shard) => {
      acc[shard.name.toLowerCase()] = shard.key;
      return acc;
    }, {} as Record<string, string>);

    return this.shardNameToKeyCache;
  }

  async loadDefaultRates(): Promise<Record<string, number>> {
    if (this.defaultRatesCache) {
      return this.defaultRatesCache;
    }

    this.defaultRatesCache = await this.fetchJson<Record<string, number>>("rates.json");
    return this.defaultRatesCache;
  }

  async loadShardCosts(useInstantBuyPrices: boolean): Promise<Record<string, number>> {
    const cacheKey = useInstantBuyPrices ? "instant_buy" : "buy_offer";
  
    if (this.bazaarPriceCache?.[cacheKey]) {
      return this.bazaarPriceCache[cacheKey];
    }

    const bazaarData = await this.fetchApi<BazaarData>("/bazaar");
    const shards = await this.loadShards();
    this.bazaarPriceCache = this.bazaarPriceCache ?? {};
    this.bazaarPriceCache[cacheKey] = {};

    for (const shard of shards) {
      const price = bazaarData.products[`${shard.internal_id}`]?.quick_status;
      this.bazaarPriceCache[cacheKey][shard.id] = useInstantBuyPrices ? price?.buyPrice : price?.sellPrice;
    }
  
    return this.bazaarPriceCache[cacheKey];
  }

  async searchShards(query: string): Promise<ShardWithKey[]> {
    const shards = await this.loadShards();
    const lowerQuery = query.toLowerCase();
    return shards.filter((shard) => shard.name.toLowerCase().includes(lowerQuery));
  }

  async searchShardsByNameOnly(query: string): Promise<ShardWithKey[]> {
    const shards = await this.loadShards();
    const lowerQuery = query.toLowerCase();
    return shards.filter((shard) => shard.name.toLowerCase().includes(lowerQuery));
  }
}
