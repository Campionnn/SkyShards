import type { ShardWithKey } from "../types";

export class DataService {
  private static instance: DataService;
  private shardsCache: ShardWithKey[] | null = null;
  private shardNameToKeyCache: Record<string, string> | null = null;
  private defaultRatesCache: Record<string, number> | null = null;

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

  async getShardByKey(key: string): Promise<ShardWithKey | undefined> {
    const shards = await this.loadShards();
    return shards.find((shard) => shard.key === key);
  }

  async getShardByName(name: string): Promise<ShardWithKey | undefined> {
    const nameToKeyMap = await this.getShardNameToKeyMap();
    const key = nameToKeyMap[name.toLowerCase()];
    return key ? this.getShardByKey(key) : undefined;
  }
}
