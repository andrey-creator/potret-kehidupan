// Teks halaman awal yang bisa diubah dari admin: kalimat pembuka (note) dan paragraf pengantar (lede),
// masing-masing dalam bahasa Indonesia dan Inggris. Nilai bawaan ada di config/site-text.json.
// Tabel site_settings hanya menyimpan teks yang DIUBAH; baris yang tidak ada berarti "pakai bawaan".

import siteText from "../../config/site-text.json";
import type { Lang } from "./i18n";

export const SETTING_KEYS = ["note_id", "note_en", "lede_id", "lede_en"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export const SETTING_LIMITS: Record<SettingKey, number> = { note_id: 120, note_en: 120, lede_id: 600, lede_en: 600 };

export const DEFAULT_SETTINGS: Record<SettingKey, string> = {
  note_id: siteText.id.note,
  note_en: siteText.en.note,
  lede_id: siteText.id.lede,
  lede_en: siteText.en.lede
};

export const isSettingKey = (key: string): key is SettingKey => (SETTING_KEYS as readonly string[]).includes(key);

/** Hanya teks yang sudah diubah (kosong jika tabel belum ada atau belum pernah diubah). */
export async function loadCustomSettings(db: D1Database): Promise<Partial<Record<SettingKey, string>>> {
  try {
    const { results } = await db.prepare("SELECT key, value FROM site_settings").all<{ key: string; value: string }>();
    const custom: Partial<Record<SettingKey, string>> = {};
    for (const row of results) if (isSettingKey(row.key) && row.value.trim()) custom[row.key] = row.value;
    return custom;
  } catch {
    return {}; // migrasi 0007 belum dijalankan: pakai teks bawaan
  }
}

/** Teks yang berlaku untuk satu bahasa (yang diubah, atau bawaan). */
export async function homeTexts(db: D1Database | undefined, lang: Lang): Promise<{ note: string; lede: string; customNote: boolean; customLede: boolean }> {
  const custom = db ? await loadCustomSettings(db) : {};
  const note = custom[`note_${lang}`];
  const lede = custom[`lede_${lang}`];
  return {
    note: note ?? DEFAULT_SETTINGS[`note_${lang}`],
    lede: lede ?? DEFAULT_SETTINGS[`lede_${lang}`],
    customNote: note !== undefined,
    customLede: lede !== undefined
  };
}

/** Merapikan teks: spasi/baris baru beruntun menjadi satu spasi. */
export const tidy = (value: string): string => value.replace(/\s+/g, " ").trim();
