type Env = {
  ADMIN_TOKEN?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const expected = env.ADMIN_TOKEN;
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const ok = Boolean(expected && received && received === expected);
  return new Response(JSON.stringify(ok ? { ok: true } : { error: "Unauthorized" }), {
    status: ok ? 200 : 401,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
};
