"use strict";

const express = require("express");
const path = require("path");
const game = require("../OnlineGame");

const app = express();
const port = Number(process.env.PORT) || 4176;
let state = null;

app.use(express.json());
app.use(express.static(path.resolve(__dirname, "..")));

app.post("/__smoke/complete", (_request, response) => {
    if (!state?.players?.length) return response.status(404).json({ error: "No smoke match exists." });
    const champion = state.players.find((player) => player.isAI) || state.players[0];
    state.status = "complete";
    state.phase = "complete";
    state.phaseEndsAt = null;
    state.championId = champion.id;
    state.message = `${champion.name} is the last commander standing`;
    state.players.forEach((player) => {
        player.eliminated = player.id !== champion.id;
        player.hp = player.id === champion.id ? Math.max(1, player.hp) : 0;
    });
    return response.json({ matchId: state.id, championId: champion.id });
});

app.post("/__smoke/duplicates", (_request, response) => {
    const player = state?.players?.find((entry) => !entry.isAI);
    if (!player || state.phase !== "build") return response.status(409).json({ error: "A human build phase is required." });
    player.credits = 20;
    player.shop = ["tracer", "tracer", "mercy"];
    return response.json({ matchId: state.id, playerId: player.id });
});

app.post("/api/online", (request, response) => {
    const { action, displayName, matchId, playerId, playerToken, payload } = request.body || {};
    try {
        if (action === "join") {
            let credentials;
            if (!state || state.status !== "waiting") {
                const created = game.createInitialState(displayName);
                state = created.state;
                credentials = created.credentials;
            } else {
                const joined = game.addHumanToWaitingState(state, displayName);
                credentials = joined.credentials;
            }
            return response.status(201).json({
                matchId: state.id,
                playerId: credentials.player.id,
                playerToken: credentials.token,
                state: game.publicState(state, credentials.player.id),
            });
        }

        if (!state || matchId !== state.id) return response.status(404).json({ error: "Match not found." });
        const player = game.findPlayerByToken(state, playerId, playerToken);
        if (!player) return response.status(401).json({ error: "Player not found." });
        game.touchPlayer(player);
        game.advanceState(state);
        if (action !== "poll") game.applyPlayerAction(state, player, action, payload || {});
        game.advanceState(state);
        return response.json({ state: game.publicState(state, player.id) });
    } catch (error) {
        return response.status(409).json({ code: error.code, error: error.message });
    }
});

app.listen(port, () => console.log(`Online smoke server running on ${port}`));
