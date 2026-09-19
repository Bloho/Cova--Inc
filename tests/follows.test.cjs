const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const actor = "11111111-1111-4111-8111-111111111111";
const target = "22222222-2222-4222-8222-222222222222";
const source = ts.transpileModule(readFileSync("app/api/follows/route.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

function setup({ user = { id: actor }, error = null, data = null } = {}) {
  const operations = [];
  const client = {
    auth: { getUser: async () => ({ data: { user } }) },
    from(table) {
      const chain = {};
      for (const method of ["insert", "delete", "select", "eq", "order", "range", "maybeSingle"]) {
        chain[method] = (...args) => { operations.push({ table, method, args }); return chain; };
      }
      chain.then = (resolve, reject) => Promise.resolve({ error, data, count: 0 }).then(resolve, reject);
      return chain;
    }
  };
  const exports = {};
  vm.runInNewContext(source, { exports, URL, require(name) {
    if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    if (name === "@/lib/supabase/server") return { createSupabaseServerClient: async () => client };
    throw new Error(name);
  } });
  return { route: exports, operations };
}

const request = (body, origin = "https://cova.lol") => new Request("https://cova.lol/api/follows", {
  method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body)
});

test("signed-out writes are denied without database writes", async () => {
  const { route, operations } = setup({ user: null });
  assert.equal((await route.POST(request({ id: target }))).status, 401);
  assert.equal(operations.length, 0);
});
test("cross-origin writes are denied", async () => {
  const { route, operations } = setup();
  assert.equal((await route.POST(request({ id: target }, "https://elsewhere.example"))).status, 403);
  assert.equal(operations.length, 0);
});
test("self-follow and malformed target are rejected", async () => {
  const { route } = setup();
  for (const id of [actor, "bad", null]) assert.equal((await route.POST(request({ id }))).status, 400);
});
test("follow identity comes from verified session, never the request", async () => {
  const { route, operations } = setup();
  assert.equal((await route.POST(request({ id: target, follower_id: target }))).status, 200);
  const payload = operations.find(operation => operation.method === "insert").args[0];
  assert.equal(payload.follower_id, actor);
  assert.equal(payload.following_id, target);
});
test("duplicate follow is idempotent", async () => {
  const { route } = setup({ error: { code: "23505" } });
  assert.equal((await route.POST(request({ id: target }))).status, 200);
});
test("unfollow is scoped to session owner and target", async () => {
  const { route, operations } = setup();
  assert.equal((await route.DELETE(request({ id: target }))).status, 200);
  assert.ok(operations.some(operation => operation.method === "eq" && operation.args[0] === "follower_id" && operation.args[1] === actor));
  assert.ok(operations.some(operation => operation.method === "eq" && operation.args[0] === "following_id" && operation.args[1] === target));
});
test("database failure is not reported as a successful follow", async () => {
  const { route } = setup({ error: { code: "42P01" } });
  assert.equal((await route.POST(request({ id: target }))).status, 503);
});
test("connection lists are bounded and private-cache only", async () => {
  const { route, operations } = setup({ data: [] });
  const response = await route.GET(new Request(`https://cova.lol/api/follows?id=${target}&kind=followers&offset=-500`));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  const range = operations.find(operation => operation.method === "range").args;
  assert.equal(range[0], 0); assert.equal(range[1], 20);
});
