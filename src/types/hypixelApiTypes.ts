export interface BazaarData {
  success: boolean;
  products: {
    [key: string]: {
      productId: string;
      sell_summary: {
        [key: number]: {
          amount: number,
          pricePerUnit: number,
          orders: number,
        }
      },
      buy_summary: {
        [key: number]: {
          amount: number,
          pricePerUnit: number,
          orders: number,
        }
      },
    };
  };
}
