import { isAuthorized, json } from "../../_lib/auth";
import { DEFAULT_SETTINGS, isSettingKey, loadCustomSettings, SETTING_KEYS, SETTING_LIMITS, SettingKey, tidy } from "../../_lib/site";

type Env = {
  DB: D1Database;
  ADMIN_TOKEN?: string;
};

async function tableExists(db: D1Database): Promise<boolean> {
  try {
    await db.prepare("SELECT 1 FROM site_settings LIMIT 1").first();
    return true;
  } catch {
    return false;
  }
}

async function snapshot(db: D1Database): Promise<{ available: boolean; values: Record<SettingKey, string>; custom: SettingKey[]; defaults: Record<SettingKey, string> }> {
  const available = await tableExists(db);
  const custom = available ? await loadCustomSettings(db) : {};
  const values = { ...DEFAULT_SETTINGS, ...custom } as Record<SettingKey, string>;
  return { available, values, custom: SETTING_KEYS.filter((key) => custom[key] !== undefined), defaults: DEFAULT_SETTINGS };
}

// Nilai yang berlaku saat ini + bawaan, untuk mengisi formulir di halaman admin.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAuthorized(request, env.ADMIN_TOKEN))) return json({ error: "Unauthorized" }, 401);
  if (!env.DB) return json({ error: "D1 binding DB belum dikonfigurasi." }, 503);
  return json(await snapshot(env.DB));
};

// Body: { note_id?, note_en?, lede_id?, lede_en? }. Teks kosong, null, atau sama dengan bawaan = kembali ke bawaan.
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAuthorized(request, env.ADMIN_TOKEN))) return json({ error: "Unauthorized" }, 401);
  if (!env.DB) return json({ error: "D1 binding DB belum dikonfigurasi." }, 503);

  let input: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new TypeError("object");
    input = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "Payload JSON tidak valid." }, 400);
  }

  const statements: D1PreparedStatement[] = [];
  for (const [key, raw] of Object.entries(input)) {
    if (!isSettingKey(key)) return json({ error: `Kunci tidak dikenal: ${key}` }, 400);
    if (raw !== null && typeof raw !== "string") return json({ error: `${key} harus berupa teks atau null.` }, 400);
    const value = raw === null ? "" : tidy(raw);
    if (value.length > SETTING_LIMITS[key]) return json({ error: `${key} terlalu panjang (maks. ${SETTING_LIMITS[key]} karakter).` }, 400);

    if (!value || value === DEFAULT_SETTINGS[key]) {
      statements.push(env.DB.prepare("DELETE FROM site_settings WHERE key = ?").bind(key));
    } else {
      statements.push(env.DB.prepare(
        "INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP"
      ).bind(key, value));
    }
  }
  if (statements.length === 0) return json({ error: "Tidak ada yang diubah." }, 400);

  try {
    await env.DB.batch(statements);
  } catch (error) {
    console.error("PUT /api/admin/settings failed", error);
    return json({ error: "Gagal menyimpan. Pastikan migrasi 0007 sudah dijalankan di D1." }, 500);
  }
  return json({ message: "Teks disimpan.", ...(await snapshot(env.DB)) });
};
