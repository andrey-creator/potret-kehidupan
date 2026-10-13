import { serveHome } from "../_lib/home";

type Env = {
  DB?: D1Database;
};

export const onRequestGet: PagesFunction<Env> = ({ request, env, next }) => serveHome(request, env, next, "en");

// HEAD (dipakai pemeriksa tautan dan beberapa crawler) dijawab seperti GET; runtime membuang isi respons.
export const onRequestHead = onRequestGet;
