export type PhotoSize = "regular" | "wide" | "tall";

export type Photo = {
  id?: number;
  src: string;
  alt: string;
  caption: string;
  size: PhotoSize;
  sort_order?: number;
  width?: number | null;
  height?: number | null;
  taken_at?: string | null;
  location?: string | null;
  // Versi bahasa Inggris (opsional; jika kosong dipakai teks Indonesia).
  caption_en?: string | null;
  alt_en?: string | null;
  location_en?: string | null;
};
