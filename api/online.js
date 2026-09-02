"use strict";

const onlineStore = require("../OnlineStore");
const onlineGame = require("../OnlineGame");

function normalizeBody(request) {
    if (request.body && typeof request.body === "object") return request.body;
    if (typeof request.body === "string") {
        try {
            return JSON.parse(request.body);
        } catch {
            return {};
        }
    }
    return {};
}

function send(response, status, body) {
    return response.status(status).json(body);
}

function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}

function databaseErrorPayload(error) {
    const number = Number(error?.number || error?.originalError?.info?.number) || null;
    if (error?.code === "DATABASE_CONFIG_MISSING") {
        return {
            status: 503,
            body: { code: error.code, error: "Online Operations needs the SQL Server DB_* environment variables." },
        };
    }
    if (number === 229) {
        return {
            status: 503,
            body: { code: "ONLINE_DATABASE_PERMISSION", error: "The SQL user cannot create or update online matches. Run migration 002 with an administrator and grant the app user SELECT, INSERT, UPDATE on OnlineMatches." },
        };
    }
    if (number === 208 || number === 51001) {
        return {
            status: 503,
            body: { code: "ONLINE_SCHEMA_REQUIRED", error: "Run database/migrations/002_online_matches.sql against the production database, then redeploy." },
        };
    }
    return {
        status: 503,
        body: { code: number ? `ONLINE_SQL_${number}` : "ONLINE_SERVICE_ERROR", error: number ? `Online matchmaking was rejected by SQL Server (error ${number}).` : "Online matchmaking is temporarily unavailable." },
    };
}

module.exports = async (request, response) => {
    if (request.method !== "POST") {
        response.setHeader("Allow", "POST");
        return send(response, 405, { code: "METHOD_NOT_ALLOWED", error: "Method not allowed." });
    }

    const body = normalizeBody(request);
    const action = String(body.action || "").toLowerCase();

    try {
        if (action === "join") {
            const displayName = String(body.displayName || "Guest");
            const joined = await onlineStore.joinOrCreate({
                createState: async () => {
                    const created = onlineGame.createInitialState(displayName);
                    return { state: created.state, credentials: created.credentials };
                },
                joinState: async (state) => {
                    const joinedState = onlineGame.addHumanToWaitingState(state, displayName);
                    return joinedState ? { state, credentials: joinedState.credentials } : null;
                },
            });

            return send(response, 201, {
                matchId: joined.state.id,
                playerId: joined.credentials.player.id,
                playerToken: joined.credentials.token,
                state: onlineGame.publicState(joined.state, joined.credentials.player.id),
            });
        }

        const matchId = String(body.matchId || "");
        const playerId = String(body.playerId || "");
        const playerToken = String(body.playerToken || "");
        if (!isUuid(matchId) || !isUuid(playerId) || playerToken.length < 20) {
            return send(response, 400, { code: "ONLINE_SESSION_INVALID", error: "The online match session is invalid." });
        }

        const result = await onlineStore.mutateMatch(matchId, async (state) => {
            const player = onlineGame.findPlayerByToken(state, playerId, playerToken);
            if (!player) {
                const error = new Error("Online player token was rejected.");
                error.code = "ONLINE_PLAYER_UNAUTHORIZED";
                throw error;
            }

            onlineGame.touchPlayer(player);
            onlineGame.advanceState(state);
            if (action !== "poll") onlineGame.applyPlayerAction(state, player, action, body.payload || {});
            onlineGame.advanceState(state);
            return player.id;
        });

        return send(response, 200, { state: onlineGame.publicState(result.state, result.value) });
    } catch (error) {
        if (error?.code === "ONLINE_MATCH_NOT_FOUND") {
            return send(response, 404, { code: error.code, error: error.message });
        }
        if (error?.code === "ONLINE_PLAYER_UNAUTHORIZED") {
            return send(response, 401, { code: error.code, error: error.message });
        }
        if (String(error?.code || "").startsWith("ONLINE_")) {
            return send(response, 409, { code: error.code, error: error.message });
        }

        console.error("Online mode API failed.", error);
        const failure = databaseErrorPayload(error);
        return send(response, failure.status, failure.body);
    }
};

