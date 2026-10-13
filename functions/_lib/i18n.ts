// Teks dan helper bahasa untuk halaman yang dirender di server (Indonesia dan Inggris).

export type Lang = "id" | "en";

type Strings = {
  htmlLang: string;
  locale: string;
  tagline: string;
  homeTitle: string;
  homeDescription: string;
  galleryLink: string;
  back: string;
  share: string;
  copied: string;
  copyManually: string;
  navLabel: string;
  pagerLabel: string;
  closeMessage: string;
  months: string[];
  formatDate: (day: number, month: string, year: string) => string;
};

export const STRINGS: Record<Lang, Strings> = {
  id: {
    htmlLang: "id",
    locale: "id_ID",
    tagline: "Kepingan hidup dalam gambar.",
    homeTitle: "Potret Kehidupan — Kepingan hidup dalam gambar.",
    homeDescription: "Potret Kehidupan — kepingan hidup dalam gambar.",
    galleryLink: "/#gallery",
    back: "← Galeri",
    share: "Bagikan",
    copied: "Tautan disalin.",
    copyManually: "Salin dari kolom alamat browser.",
    navLabel: "Navigasi halaman foto",
    pagerLabel: "Foto lainnya",
    closeMessage: "Tutup pesan",
    months: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"],
    formatDate: (day, month, year) => `${day} ${month} ${year}`
  },
  en: {
    htmlLang: "en",
    locale: "en_US",
    tagline: "Fragments of life, in pictures.",
    homeTitle: "Potret Kehidupan — Fragments of life, in pictures.",
    homeDescription: "Potret Kehidupan — fragments of life, in pictures.",
    galleryLink: "/en/#gallery",
    back: "← Gallery",
    share: "Share",
    copied: "Link copied.",
    copyManually: "Copy it from the browser address bar.",
    navLabel: "Photo page navigation",
    pagerLabel: "More photos",
    closeMessage: "Close message",
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    formatDate: (day, month, year) => `${month} ${day}, ${year}`
  }
};

export const homePath = (lang: Lang): string => (lang === "en" ? "/en/" : "/");
export const photoPath = (lang: Lang, id: number | string): string => (lang === "en" ? `/en/photo/${id}` : `/foto/${id}`);

export const formatDate = (lang: Lang, iso: string | null | undefined): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!match) return "";
  const strings = STRINGS[lang];
  const month = strings.months[Number(match[2]) - 1];
  return month ? strings.formatDate(Number(match[3]), month, match[1]) : "";
};

/** Pilih teks versi bahasa; jika terjemahan Inggris kosong, pakai teks Indonesia. */
export const pick = (lang: Lang, base: string | null | undefined, english: string | null | undefined): string => {
  const en = english?.trim();
  return (lang === "en" && en ? en : base) ?? "";
};

/** Tag hreflang untuk pasangan halaman Indonesia dan Inggris. */
export const alternateLinks = (origin: string, idPath: string, enPath: string): string => [
  `<link rel="alternate" hreflang="id" href="${origin}${idPath}">`,
  `<link rel="alternate" hreflang="en" href="${origin}${enPath}">`,
  `<link rel="alternate" hreflang="x-default" href="${origin}${idPath}">`
].join("\n  ");
