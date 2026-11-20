export interface BazaarData {
  success: boolean;
  /** When Hypixel last refreshed the snapshot, in ms since the epoch. */
  lastUpdated?: number;
  products: {
    [key: string]: {
      productId: string;
      sell_summary: {
        [key: number]: {
          amount: number;
          pricePerUnit: number;
          orders: number;
        };
      };
      buy_summary: {
        [key: number]: {
          amount: number;
          pricePerUnit: number;
          orders: number;
        };
      };
      /** Totals per product. The *MovingWeek fields count units traded over the last 7 days. */
      quick_status?: {
        /** Units bought instantly (filled from sell offers). */
        buyMovingWeek: number;
        /** Units sold instantly (filled into buy orders). */
        sellMovingWeek: number;
      };
    };
  };
}

/** A mayor or minister perk. */
export interface ElectionPerk {
  name: string;
  description?: string;
  minister?: boolean;
}

/** The parts of /v2/resources/skyblock/election the app reads: who is in office and their perks. */
export interface ElectionData {
  success: boolean;
  mayor?: {
    key?: string;
    name?: string;
    perks?: ElectionPerk[];
    minister?: {
      key?: string;
      name?: string;
      perk?: ElectionPerk;
    };
  };
}
