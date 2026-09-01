import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hashPassword, verifyPassword } from "./password.js";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("s3cret-pass");
    assert.equal(await verifyPassword("S3cret-pass", hash), false);
    assert.equal(await verifyPassword("", hash), false);
  });

  it("produces a distinct salt per call", async () => {
    const a = await hashPassword("same-input");
    const b = await hashPassword("same-input");
    assert.notEqual(a, b);
    assert.equal(await verifyPassword("same-input", a), true);
    assert.equal(await verifyPassword("same-input", b), true);
  });

  it("returns false for malformed or empty stored hashes", async () => {
    assert.equal(await verifyPassword("x", null), false);
    assert.equal(await verifyPassword("x", ""), false);
    assert.equal(await verifyPassword("x", "not-a-hash"), false);
    assert.equal(await verifyPassword("x", "scrypt$zz$zz"), false);
  });
});
