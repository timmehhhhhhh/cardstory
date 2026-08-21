export interface TradeItem {
  catalogItemId: string;
  gameId: string;
  externalId: string;
  name: string;
  nameEn: string | null;
  number: string | null;
  imageSmallUrl: string | null;
  priceRaw: number | null;
  quantity: number;
}
