import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertIdTokenClaims } from "./google-oauth.service.js";

const AUD = "web-client-id.apps.googleusercontent.com";
const NOW = 1_800_000_000; // fixed reference

function claims(over: Record<string, unknown> = {}) {
  return {
    iss: "https://accounts.google.com",
    aud: AUD,
    exp: NOW + 600,
    sub: "108124567890",
    email: "user@example.com",
    email_verified: true,
    ...over,
  };
}

describe("assertIdTokenClaims", () => {
  const opts = { nowSeconds: NOW, allowedAudiences: [AUD] };

  it("accepts a well-formed token", () => {
    assert.doesNotThrow(() => assertIdTokenClaims(claims(), opts));
  });

  it("accepts the bare accounts.google.com issuer", () => {
    assert.doesNotThrow(() =>
      assertIdTokenClaims(claims({ iss: "accounts.google.com" }), opts),
    );
  });

  it("rejects a foreign issuer", () => {
    assert.throws(
      () => assertIdTokenClaims(claims({ iss: "https://evil.example" }), opts),
      /発行者/,
    );
  });

  it("rejects a mismatched audience", () => {
    assert.throws(
      () => assertIdTokenClaims(claims({ aud: "someone-elses-id" }), opts),
      /クライアント/,
    );
  });

  it("rejects an expired token (beyond the 60s skew)", () => {
    assert.throws(
      () => assertIdTokenClaims(claims({ exp: NOW - 120 }), opts),
      /有効期限/,
    );
  });

  it("allows a token within the 60s clock-skew grace", () => {
    assert.doesNotThrow(() =>
      assertIdTokenClaims(claims({ exp: NOW - 30 }), opts),
    );
  });

  it("rejects a token with no sub", () => {
    assert.throws(
      () => assertIdTokenClaims(claims({ sub: undefined }), opts),
      /sub/,
    );
  });
});
