type Env = { PHOTOS: R2Bucket };

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const keyValue = params.key;
  const key = Array.isArray(keyValue) ? keyValue.join("/") : keyValue;
  if (!key || !env.PHOTOS) return new Response("Not found", { status: 404 });
  const object = await env.PHOTOS.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
};
