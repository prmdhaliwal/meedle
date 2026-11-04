const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");

// Exercise startup configuration without opening a server or contacting MongoDB.
function startup(env = {}) {
  const result = {};
  const app = Object.fromEntries(
    ["use", "engine", "set", "get"].map((method) => [method, () => app])
  );
  app.listen = (...args) => { result.listen = args; };
  const express = () => app;
  for (const method of ["static", "urlencoded", "json"]) {
    express[method] = () => () => {};
  }
  vm.runInNewContext(source, {
    require(name) {
      if (name === "express") return express;
      if (name === "ejs") return { renderFile() {} };
      if (name === "mongoose") {
        return { connect(url) { result.database = url; return Promise.resolve(); } };
      }
      if (name.startsWith("./")) return {};
      throw new Error(`Unexpected startup dependency: ${name}`);
    },
    process: { env },
    global: {},
    console: { log() {}, error() {} }
  });
  return result;
}

test("database defaults to a credential-free local demo", () => {
  assert.equal(startup().database, "mongodb://127.0.0.1:27017/fit2101_lms");
});

test("database configuration can be supplied through the environment", () => {
  const uri = "mongodb://127.0.0.1:27018/lms_test";
  assert.equal(startup({ MONGO_URI: uri }).database, uri);
});

test("server defaults to loopback rather than a public interface", () => {
  assert.deepEqual(startup().listen.slice(0, 2), [8080, "127.0.0.1"]);
});

test("host and numeric port can be supplied through the environment", () => {
  assert.deepEqual(startup({ PORT: "8765", HOST: "127.0.0.1" }).listen.slice(0, 2), [8765, "127.0.0.1"]);
});

test("relative application imports match on-disk filename casing", () => {
  const files = ["app.js", ...["models", "routes"].flatMap((dir) =>
    fs.readdirSync(path.join(root, dir)).filter((name) => name.endsWith(".js")).map((name) => path.join(dir, name))
  )];
  for (const file of files) {
    const content = fs.readFileSync(path.join(root, file), "utf8");
    for (const match of content.matchAll(/require\(["'](\.[^"']+)["']\)/g)) {
      const target = path.resolve(path.dirname(path.join(root, file)), match[1]);
      const resolved = [target, `${target}.js`, path.join(target, "index.js")]
        .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      assert.ok(resolved, `${file}: missing import ${match[1]}`);
      let parent = root;
      for (const segment of path.relative(root, resolved).split(path.sep)) {
        assert.ok(fs.readdirSync(parent).includes(segment), `${file}: incorrect casing in ${match[1]}`);
        parent = path.join(parent, segment);
      }
    }
  }
});
