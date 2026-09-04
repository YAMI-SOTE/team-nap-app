import assert from "node:assert/strict";
import crypto from "node:crypto";
import { before, describe, it } from "node:test";

import { open, resetSecretBoxKey, seal } from "./secret-box.js";

// A fixed 32-byte key for the whole file. Set before any seal/open call;
// the module reads process.env lazily so this is enough.
const KEY_B64 = crypto.randomBytes(32).toString("base64");

describe("secret-box", () => {
  before(() => {
    process.env.GOOGLE_TOKEN_ENC_KEY = KEY_B64;
    resetSecretBoxKey();
  });

  it("round-trips a value", () => {
    const secret = "1//refresh-token-value.abc123";
    assert.equal(open(seal(secret)), secret);
  });

  it("round-trips unicode + empty string", () => {
    assert.equal(open(seal("空きトークン🌙")), "空きトークン🌙");
    assert.equal(open(seal("")), "");
  });

  it("produces a fresh IV each time (ciphertext differs)", () => {
    assert.notEqual(seal("same"), seal("same"));
  });

  it("rejects a tampered ciphertext", () => {
    const blob = seal("do-not-forge");
    const parts = blob.split(".");
    const data = Buffer.from(parts[3], "base64");
    data[0] ^= 0x01;
    parts[3] = data.toString("base64");
    assert.throws(() => open(parts.join(".")));
  });

  it("rejects a malformed blob", () => {
    assert.throws(() => open("not-a-sealed-value"));
    assert.throws(() => open("v2.a.b.c"));
  });

  it("rejects a key that is not 32 bytes", () => {
    process.env.GOOGLE_TOKEN_ENC_KEY = Buffer.from("too-short").toString(
      "base64",
    );
    resetSecretBoxKey();
    assert.throws(() => seal("x"), /32 bytes/);
    // restore for any later tests
    process.env.GOOGLE_TOKEN_ENC_KEY = KEY_B64;
    resetSecretBoxKey();
  });
});
