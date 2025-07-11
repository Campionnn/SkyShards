export interface HypixelBazaarResponse {
  success: boolean;
  lastUpdated: number;
  products: Record<string, HypixelProduct>;
}

export interface HypixelProduct {
  product_id: string;
  sell_summary: PriceData[];
  buy_summary: PriceData[];
  quick_status: {
    productId: string;
    sellPrice: number;
    sellVolume: number;
    sellMovingWeek: number;
    sellOrders: number;
    buyPrice: number;
    buyVolume: number;
    buyMovingWeek: number;
    buyOrders: number;
  };
}

export interface PriceData {
  amount: number;
  pricePerUnit: number;
  orders: number;
}

export interface ShardPriceData {
  shardId: string;
  shardName: string;
  hypixelId: string;
  instantSell: number;
  instantBuy: number;
  buyOrder: number;
  sellOrder: number;
  lastUpdated: number;
  available: boolean;
}

class HypixelApiService {
  private static instance: HypixelApiService;
  private baseUrl = "https://api.hypixel.net/v2/skyblock/bazaar";
  private cache: Map<string, { data: HypixelBazaarResponse; timestamp: number }> = new Map();
  private readonly cacheTime = 60000; // 1 minute cache

  static getInstance(): HypixelApiService {
    if (!HypixelApiService.instance) {
      HypixelApiService.instance = new HypixelApiService();
    }
    return HypixelApiService.instance;
  }

  private async fetchBazaarData(): Promise<HypixelBazaarResponse> {
    const cacheKey = "bazaar";
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTime) {
      return cached.data;
    }

    try {
      const response = await fetch(this.baseUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: HypixelBazaarResponse = await response.json();

      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } catch (error) {
      console.error("Failed to fetch Hypixel bazaar data:", error);
      throw error;
    }
  }

  async getShardPrices(shardIds: string[], shardData: Record<string, any>): Promise<ShardPriceData[]> {
    try {
      const bazaarData = await this.fetchBazaarData();

      // Debug logging
      console.log("Fetched bazaar data with", Object.keys(bazaarData.products).length, "products");
      console.log("Sample products:", Object.keys(bazaarData.products).slice(0, 10));

      return shardIds.map((shardId) => {
        const shard = shardData[shardId];
        // Use the internal_id from the shard data as the Hypixel product ID
        const hypixelId = shard?.internal_id || shardId;

        if (!shard) {
          return {
            shardId,
            shardName: shardId,
            hypixelId: hypixelId,
            instantSell: 0,
            instantBuy: 0,
            buyOrder: 0,
            sellOrder: 0,
            lastUpdated: bazaarData.lastUpdated,
            available: false,
          };
        }

        let priceData: ShardPriceData = {
          shardId,
          shardName: shard.name,
          hypixelId: hypixelId,
          instantSell: 0,
          instantBuy: 0,
          buyOrder: 0,
          sellOrder: 0,
          lastUpdated: bazaarData.lastUpdated,
          available: false,
        };

        // Check if the shard's internal_id exists in the bazaar data
        if (hypixelId && bazaarData.products[hypixelId]) {
          const product = bazaarData.products[hypixelId];

          // Debug logging for found products
          console.log(`Found product for ${shard.name} (${hypixelId}):`, product.quick_status);

          priceData = {
            ...priceData,
            instantSell: product.quick_status.sellPrice,
            instantBuy: product.quick_status.buyPrice,
            buyOrder: product.buy_summary[0]?.pricePerUnit || 0,
            sellOrder: product.sell_summary[0]?.pricePerUnit || 0,
            available: true,
          };
        } else {
          // Debug logging for missing products
          console.log(`No product found for ${shard.name} (${hypixelId})`);
        }

        return priceData;
      });
    } catch (error) {
      console.error("Error fetching shard prices:", error);
      // Return empty data on error
      return shardIds.map((shardId) => ({
        shardId,
        shardName: shardData[shardId]?.name || shardId,
        hypixelId: shardData[shardId]?.internal_id || shardId,
        instantSell: 0,
        instantBuy: 0,
        buyOrder: 0,
        sellOrder: 0,
        lastUpdated: Date.now(),
        available: false,
      }));
    }
  }

  formatPrice(price: number): string {
    if (price === 0) return "N/A";

    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `${(price / 1000).toFixed(1)}K`;
    } else {
      return Math.round(price).toString();
    }
  }

  formatLastUpdated(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) {
      return "Just now";
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours}h ago`;
    }
  }
}

export default HypixelApiService;
