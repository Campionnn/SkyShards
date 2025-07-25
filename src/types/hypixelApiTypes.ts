export interface BazaarData {
  success: boolean;
  products: {
    [key: string]: {
      productId: string;
      quick_status: {
        buyPrice: number;
        sellPrice: number;
      };
    };
  };
}
