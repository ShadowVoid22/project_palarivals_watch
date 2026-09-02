"use strict";

const crypto = require("crypto");

const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 30;

function sessionSecret() {
    const secret = String(process.env.AUTH_SESSION_SECRET || process.env.DB_PASSWORD || "").trim();
    if (!secret) {
        const error = new Error("AUTH_SESSION_SECRET is not configured.");
        error.code = "AUTH_SESSION_SECRET_MISSING";
        throw error;
    }
    return secret;
}

function sign(payload) {
    return crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function createSessionToken(user) {
    const payload = Buffer.from(JSON.stringify({
        sub: String(user.UserID),
        username: String(user.Username),
        exp: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
    })).toString("base64url");
    return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token) {
    if (typeof token !== "string") return null;
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;

    const expected = Buffer.from(sign(payload));
    const supplied = Buffer.from(signature);
    if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return null;

    try {
        const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (!session?.sub || !session?.username || Number(session.exp) <= Math.floor(Date.now() / 1000)) return null;
        return session;
    } catch {
        return null;
    }
}

module.exports = { createSessionToken, verifySessionToken };
