export type VisionItem = {
  title: string;
  platform?: string | null;
  category: 'game'|'dvd'|'vhs'|'book'|'comic'|'toy'|'diecast'|'other';
  year?: number | null;
  gpt_value_aud?: number | null;
  search: string;
};

export type VisionResult = {
  lot_summary: string;
  items: VisionItem[];
};

export type EbayResult = {
  title: string;
  sold_prices_aud: number[];
  sold_links: string[];
  avg_sold_aud: number | null;
  sold_90d: number | null;
  available_now: number | null;
  sold_search_link: string;
  status: 'OK'|'NRS';
  raw_sold_count?: number | null;
  filtered_count?: number | null;
  active_parse_method?: string | null;
};
