import { isAuthorized, json } from "../../_lib/auth";

type Env = {
  ADMIN_TOKEN?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ok = await isAuthorized(request, env.ADMIN_TOKEN);
  return json(ok ? { ok: true } : { error: "Unauthorized" }, ok ? 200 : 401);
};
