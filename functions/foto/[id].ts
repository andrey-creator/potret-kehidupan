import { renderPhotoPage } from "../_lib/photo-page";

type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
};

export const onRequestGet: PagesFunction<Env> = ({ request, env, params }) => renderPhotoPage(request, env, params.id, "id");

// HEAD (dipakai pemeriksa tautan dan beberapa crawler) dijawab seperti GET; runtime membuang isi respons.
export const onRequestHead = onRequestGet;
