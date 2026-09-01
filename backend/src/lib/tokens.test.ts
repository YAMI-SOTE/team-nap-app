import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bearerToken, generateToken, hashToken } from "./tokens.js";

describe("session tokens", () => {
  it("generates url-safe, unique tokens", () => {
    const a = generateToken();
    const b = generateToken();
    assert.notEqual(a, b);
    assert.match(a, /^[A-Za-z0-9_-]+$/);
  });

  it("hashes deterministically to sha256 hex", () => {
    assert.equal(hashToken("abc"), hashToken("abc"));
    assert.match(hashToken("abc"), /^[0-9a-f]{64}$/);
    assert.notEqual(hashToken("abc"), hashToken("abd"));
  });

  it("parses the Authorization header", () => {
    assert.equal(bearerToken("Bearer xyz"), "xyz");
    assert.equal(bearerToken("bearer xyz"), "xyz");
    assert.equal(bearerToken("Bearer  "), null);
    assert.equal(bearerToken("Basic xyz"), null);
    assert.equal(bearerToken(undefined), null);
    assert.equal(bearerToken(""), null);
  });
});
