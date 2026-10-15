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
  story?: string | null;
  // Versi bahasa Inggris (opsional; jika kosong dipakai teks Indonesia).
  caption_en?: string | null;
  alt_en?: string | null;
  location_en?: string | null;
  story_en?: string | null;
  // Pratinjau buram: data URI JPEG/WebP mungil yang tampil sebelum foto selesai dimuat.
  blur?: string | null;
};
