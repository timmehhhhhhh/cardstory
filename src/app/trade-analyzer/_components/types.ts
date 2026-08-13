export interface TradeItem {
  catalogItemId: string;
  gameId: string;
  externalId: string;
  name: string;
  imageSmallUrl: string | null;
  priceRaw: number | null;
  quantity: number;
}
