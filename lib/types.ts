export type VisionItem = {
  title: string;
  platform?: string | null;
  category?: string | null;
  year?: number | null;
  gpt_value_aud?: number | null;
  search?: string | null;
  brand?: string | null;
  theme?: string | null;
  set_number?: string | null;
  official_name?: string | null;
  pieces?: number | null;
  condition?: string | null;
  quantity?: number | null;
};
export type VisionResult = { lot_summary: string; items: VisionItem[]; };
export type EbayResult = {
  title: string;
  sold_prices_aud: number[];
  sold_links: string[];
  avg_sold_aud: number | null;
  sold_90d: number;
  available_now: number | null;
  sold_search_link: string;
  status: 'OK'|'NRS';
};
