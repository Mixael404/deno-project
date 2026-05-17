export async function renderView(name) {
  const html = await Deno.readTextFile(`./views/${name}.html`);
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}