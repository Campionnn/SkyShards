import type { BazaarData } from "../types/hypixelApiTypes.ts";
import type { FusionJson, Shard } from "../types/types";
import { sortShardsByNameWithPrefixAwareness, filterShards, BASIC_FILTER_CONFIG, NAME_ONLY_FILTER_CONFIG } from "../utilities";

export class DataService {
  private static instance: DataService;
  private shardsCache: Shard[] | null = null;
  private shardNameToKeyCache: Record<string, string> | null = null;
  private fusionJsonCache: Promise<FusionJson> | null = null;
  private defaultRatesCache: Promise<Record<string, number>> | null = null;
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

  async loadShards(): Promise<Shard[]> {
    if (this.shardsCache) {
      return this.shardsCache;
    }

    const [fusionData, defaultRates] = await Promise.all([this.loadFusionJson(), this.loadDefaultRates()]);

    this.shardsCache = Object.entries(fusionData.shards).map(([id, shard]: [string, Shard]) => ({
        ...shard,
        id,
        rate: defaultRates[id] || 0,
    }));

    return this.shardsCache;
  }

  async getShardNameToKeyMap(): Promise<Record<string, string>> {
    if (this.shardNameToKeyCache) {
      return this.shardNameToKeyCache;
    }

    const shards = await this.loadShards();
    this.shardNameToKeyCache = shards.reduce((acc, shard) => {
      acc[shard.name.toLowerCase()] = shard.id;
      return acc;
    }, {} as Record<string, string>);

    return this.shardNameToKeyCache;
  }

  /**
   * The raw `fusion-data.json`, memoised. The file is ~6.5 MB, so this caches the
   * in-flight promise rather than the result: concurrent callers on a cold cache share
   * one request and one parse instead of racing to do both twice.
   *
   * A failed load clears the cache so the next caller retries rather than being handed
   * a permanently rejected promise.
   */
  async loadFusionJson(): Promise<FusionJson> {
    if (!this.fusionJsonCache) {
      this.fusionJsonCache = this.fetchJson<FusionJson>("fusion-data.json").catch((error) => {
        this.fusionJsonCache = null;
        throw error;
      });
    }
    return this.fusionJsonCache;
  }

  /**
   * Promise-cached like `loadFusionJson`: caching the awaited result instead leaves a
   * window where two concurrent callers both see an empty cache and both fetch.
   */
  async loadDefaultRates(): Promise<Record<string, number>> {
    if (!this.defaultRatesCache) {
      this.defaultRatesCache = this.fetchJson<Record<string, number>>("rates.json").catch((error) => {
        this.defaultRatesCache = null;
        throw error;
      });
    }
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
      const product = bazaarData.products[shard.internal_id];
      // Annotated as optional because the index signatures lie: shards absent from the
      // Bazaar response, and products with an empty order book on one side, both resolve
      // to `undefined` at runtime.
      const order: { pricePerUnit: number } | undefined = useInstantBuyPrices
        ? product?.buy_summary?.[0]
        : product?.sell_summary?.[0];
      // Leave the key unset rather than storing `undefined` in a Record<string, number>,
      // so consumers' `?? fallback` fires as intended.
      if (order !== undefined) {
        this.bazaarPriceCache[cacheKey][shard.id] = order.pricePerUnit;
      }
    }
  
    return this.bazaarPriceCache[cacheKey];
  }

  private sortShardsByQuery(shards: Shard[], query: string): Shard[] {
    const lowerQuery = query.toLowerCase();
    return shards.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aKey = a.id.toLowerCase();
      const bKey = b.id.toLowerCase();
      const aStarts = aName.startsWith(lowerQuery) || aKey.startsWith(lowerQuery);
      const bStarts = bName.startsWith(lowerQuery) || bKey.startsWith(lowerQuery);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return sortShardsByNameWithPrefixAwareness(a, b);
    });
  }

  async searchShards(query: string): Promise<Shard[]> {
    const shards = await this.loadShards();
    const filtered = filterShards(shards, {
      query,
      searchConfig: BASIC_FILTER_CONFIG,
    });

    return this.sortShardsByQuery(filtered, query);
  }

  async searchShardsByNameOnly(query: string): Promise<Shard[]> {
    const shards = await this.loadShards();
    const filtered = filterShards(shards, {
      query,
      searchConfig: NAME_ONLY_FILTER_CONFIG,
    });

    // If no results found searching by name only, try searching title and description
    if (filtered.length === 0) {
      const fallbackConfig = {
        name: false,
        id: false,
        family: false,
        type: false,
        title: true,
        description: true,
      };

      const fallbackFiltered = filterShards(shards, {
        query,
        searchConfig: fallbackConfig,
      });

      return this.sortShardsByQuery(fallbackFiltered, query);
    }

    return this.sortShardsByQuery(filtered, query);
  }
}
