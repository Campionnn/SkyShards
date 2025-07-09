import type { ShardWithKey } from "../types";
import { SHARD_DESCRIPTIONS } from "../constants";

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

  async loadShards(): Promise<ShardWithKey[]> {
    if (this.shardsCache) {
      return this.shardsCache;
    }

    try {
      const url = `${import.meta.env.BASE_URL}fusion-data.json`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const defaultRates = await this.loadDefaultRates();

      this.shardsCache = Object.entries(data.shards).map(([key, shard]: [string, any]) => ({
        key,
        ...shard,
        id: key,
        rate: defaultRates[key] || 0,
      }));

      return this.shardsCache;
    } catch (error) {
      console.error("Failed to load shards:", error);
      throw new Error(`Failed to load shards: ${error}`);
    }
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

    try {
      const response = await fetch(`${import.meta.env.BASE_URL}rates.json`);
      this.defaultRatesCache = await response.json();
      return this.defaultRatesCache!;
    } catch (error) {
      throw new Error(`Failed to load default rates: ${error}`);
    }
  }

  async searchShards(query: string): Promise<ShardWithKey[]> {
    const shards = await this.loadShards();
    const lowerQuery = query.toLowerCase();

    return shards.filter((shard) => {
      const matchesName = shard.name.toLowerCase().includes(lowerQuery);

      const matchesFamily = shard.family.toLowerCase().includes(lowerQuery);
      const matchesType = shard.type.toLowerCase().includes(lowerQuery);

      const shardDesc = SHARD_DESCRIPTIONS[shard.key as keyof typeof SHARD_DESCRIPTIONS];
      const matchesTitle = shardDesc?.title?.toLowerCase().includes(lowerQuery) || false;
      const matchesDescription = shardDesc?.description?.toLowerCase().includes(lowerQuery) || false;

      return matchesName || matchesFamily || matchesType || matchesTitle || matchesDescription;
    });
  }

  async searchShardsByNameOnly(query: string): Promise<ShardWithKey[]> {
    const shards = await this.loadShards();
    const lowerQuery = query.toLowerCase();

    return shards.filter((shard) => {
      return shard.name.toLowerCase().includes(lowerQuery);
    });
  }

  async getShardByKey(key: string): Promise<ShardWithKey | undefined> {
    const shards = await this.loadShards();
    return shards.find((shard) => shard.key === key);
  }

  async getShardByName(name: string): Promise<ShardWithKey | undefined> {
    const nameToKeyMap = await this.getShardNameToKeyMap();
    const key = nameToKeyMap[name.toLowerCase()];
    if (!key) return undefined;

    return this.getShardByKey(key);
  }
}
