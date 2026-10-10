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
};
