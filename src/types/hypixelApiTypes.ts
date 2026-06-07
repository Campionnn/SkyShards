export interface BazaarOrderSummary {
  amount: number;
  pricePerUnit: number;
  orders: number;
}

export interface BazaarData {
  success: boolean;
  products: {
    [key: string]: {
      productId: string;
      quick_status: {
        buyPrice: number;
        sellPrice: number;
      };
      // Order book summaries. NOTE the Hypixel naming inversion:
      //   buy_summary[0]  = lowest sell offer  → the "instabuy" price (in-game "Buy price")
      //   sell_summary[0] = highest buy order  → the "buy order" price (in-game "Sell price")
      buy_summary?: BazaarOrderSummary[];
      sell_summary?: BazaarOrderSummary[];
    };
  };
}
