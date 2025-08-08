export type VisionItem = {
  title: string;
  platform?: string | null;
  category?: string | null;
  year?: number | null;
  gpt_value_aud?: number | null;
  search?: string | null;
  // brand-specific fields
  brand?: string | null;
  theme?: string | null;
  set_number?: string | null;         // LEGO
  official_name?: string | null;      // LEGO / general
  pieces?: number | null;
  condition?: string | null;
  quantity?: number | null;
};

export type VisionResult = {
  lot_summary: string;
  items: VisionItem[];
};

export type EbayResult = {
  title: string;                 // query used
  sold_prices_aud: number[];
  sold_links: string[];
  avg_sold_aud: number | null;   // actually median
  sold_90d: number | null;
  available_now: number | null;
  sold_search_link: string;
  status: 'OK' | 'NRS';
};
