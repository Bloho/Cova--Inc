const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { webcrypto } = require("node:crypto");

function setup(file, { user = { id: "owner" }, error = null, uploadError = null } = {}) {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user } }) },
    rpc: async (name, args) => { calls.push({ name, args }); return { error }; },
    from(table) {
      let write = false;
      const chain = {};
      for (const method of ["select", "eq", "single", "update"]) chain[method] = (...args) => {
        calls.push({ table, method, args });
        if (method === "update") write = true;
        return chain;
      };
      chain.then = (resolve, reject) => Promise.resolve({ error: write ? error : null, data: { avatar_url: null, banner_url: null } }).then(resolve, reject);
      return chain;
    },
    storage: { from(bucket) { return {
      async upload(path) { calls.push({ bucket, upload: path }); return { error: uploadError }; },
      getPublicUrl(path) { return { data: { publicUrl: `https://storage.example/${path}` } }; },
      async remove(paths) { calls.push({ bucket, remove: paths }); return { error: null }; }
    }; } }
  };
  const exports = {};
  const source = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, Request, URL, Uint8Array, crypto: webcrypto, require(name) {
    if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    if (name === "@/lib/supabase/server") return { createSupabaseServerClient: async () => client };
    throw new Error(name);
  } });
  return { route: exports, calls };
}
const reviewRoute = "app/api/review/route.ts";
const settingsRoute = "app/api/profile/settings/route.ts";
const reviewRequest = body => new Request("https://cova.lol/api/review", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
function settingsRequest({ name = "Ayush", image, origin = "https://cova.lol", remove = false } = {}) {
  const form = new FormData();
  form.set("displayName", name);
  form.set("id", "someone-else");
  if (image) form.set("banner", image, "banner.jpg");
  if (remove) form.set("removeavatar", "true");
  return new Request("https://cova.lol/api/profile/settings", { method: "POST", headers: { origin }, body: form });
}

test("review deletion requires a session", async () => {
  const { route, calls } = setup(reviewRoute, { user: null });
  assert.equal((await route.DELETE(reviewRequest({ tmdbId: 12 }))).status, 401);
  assert.equal(calls.length, 0);
});
test("review deletion uses one atomic RPC and defaults to removing Watched", async () => {
  const { route, calls } = setup(reviewRoute);
  assert.equal((await route.DELETE(reviewRequest({ tmdbId: 12, user_id: "someone-else" }))).status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "delete_own_review");
  assert.equal(calls[0].args.movie_id, 12);
  assert.equal(calls[0].args.keep_watched, false);
  assert.equal(calls[0].args.user_id, undefined);
});
test("keeping Watched and custom film IDs are supported", async () => {
  const { route, calls } = setup(reviewRoute);
  assert.equal((await route.DELETE(reviewRequest({ tmdbId: -12, keepWatched: true }))).status, 200);
  assert.equal(calls[0].args.keep_watched, true);
});
test("malformed deletion input is rejected without writes", async () => {
  const { route, calls } = setup(reviewRoute);
  for (const body of [null, {}, { tmdbId: "12" }, { tmdbId: 1.5 }, { tmdbId: 0 }, { tmdbId: 12, keepWatched: "false" }]) {
    assert.equal((await route.DELETE(reviewRequest(body))).status, 400);
  }
  assert.equal(calls.length, 0);
});
test("RPC failure does not fall back to a partial delete", async () => {
  const { route, calls } = setup(reviewRoute, { error: { message: "missing migration" } });
  assert.equal((await route.DELETE(reviewRequest({ tmdbId: 12 }))).status, 503);
  assert.equal(calls.length, 1);
});
test("profile settings require a session and reject foreign origins", async () => {
  const signedOut = setup(settingsRoute, { user: null });
  assert.equal((await signedOut.route.POST(settingsRequest())).status, 401);
  assert.equal(signedOut.calls.length, 0);
  const signedIn = setup(settingsRoute);
  assert.equal((await signedIn.route.POST(settingsRequest({ origin: "https://elsewhere.example" }))).status, 403);
  assert.equal(signedIn.calls.length, 0);
});
test("profile names and image bytes are validated before storage writes", async () => {
  const { route, calls } = setup(settingsRoute);
  for (const name of [" ", "x".repeat(17)]) assert.equal((await route.POST(settingsRequest({ name }))).status, 400);
  assert.equal((await route.POST(settingsRequest({ image: new Blob(["not a JPEG"], { type: "image/jpeg" }) }))).status, 400);
  assert.equal((await route.POST(settingsRequest({ image: new Blob(["<svg />"], { type: "image/svg+xml" }) }))).status, 400);
  assert.equal(calls.length, 0);
});
test("oversized forms are rejected", async () => {
  const { route, calls } = setup(settingsRoute);
  const form = settingsRequest({ image: new Blob([new Uint8Array(2_200_001)], { type: "image/jpeg" }) });
  const request = new Request(form.url, { method: "POST", headers: form.headers, body: await form.arrayBuffer() });
  assert.equal((await route.POST(request)).status, 413);
  assert.equal(calls.length, 0);
});
test("profile changes are scoped to the verified owner", async () => {
  const { route, calls } = setup(settingsRoute);
  assert.equal((await route.POST(settingsRequest({ name: " Ayush ", remove: true }))).status, 200);
  const update = calls.find(call => call.method === "update").args[0];
  assert.equal(update.display_name, "Ayush");
  assert.equal(update.avatar_url, null);
  assert.ok(calls.filter(call => call.method === "eq").every(call => call.args[0] === "id" && call.args[1] === "owner"));
});
test("new media is removed if the profile update fails", async () => {
  const { route, calls } = setup(settingsRoute, { error: { message: "database unavailable" } });
  const image = new Blob([new Uint8Array([255, 216, 255, 217])], { type: "image/jpeg" });
  assert.equal((await route.POST(settingsRequest({ image }))).status, 500);
  const upload = calls.find(call => call.upload);
  assert.match(upload.upload, /^owner\/banner-.*\.jpg$/);
  assert.equal(calls.find(call => call.remove).remove[0], upload.upload);
});
