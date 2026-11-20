export interface BazaarData {
  success: boolean;
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
