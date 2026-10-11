import { serveHome } from "../_lib/home";

type Env = {
  DB?: D1Database;
};

export const onRequestGet: PagesFunction<Env> = ({ request, env, next }) => serveHome(request, env, next, "en");
