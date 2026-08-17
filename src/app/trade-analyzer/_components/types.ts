export interface TradeItem {
  catalogItemId: string;
  gameId: string;
  externalId: string;
  name: string;
  number: string | null;
  imageSmallUrl: string | null;
  priceRaw: number | null;
  quantity: number;
}
