import type { PriceChartingProduct } from "@/lib/pricing/pricecharting/client";

function centsToDollars(cents: number | undefined): number | null {
  return typeof cents === "number" ? cents / 100 : null;
}

export interface GradedPriceValues {
  loosePrice: number | null;
  grade7Price: number | null;
  grade8Price: number | null;
  grade9Price: number | null;
  grade95Price: number | null;
  psa10Price: number | null;
  cgc10Price: number | null;
  sgc10Price: number | null;
  bgs10Price: number | null;
}

export function mapPriceChartingProduct(product: PriceChartingProduct): GradedPriceValues {
  return {
    loosePrice: centsToDollars(product["loose-price"]),
    grade7Price: centsToDollars(product["cib-price"]),
    grade8Price: centsToDollars(product["new-price"]),
    grade9Price: centsToDollars(product["graded-price"]),
    grade95Price: centsToDollars(product["box-only-price"]),
    psa10Price: centsToDollars(product["manual-only-price"]),
    cgc10Price: centsToDollars(product["condition-17-price"]),
    sgc10Price: centsToDollars(product["condition-18-price"]),
    bgs10Price: centsToDollars(product["bgs-10-price"]),
  };
}
