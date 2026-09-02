"use strict";

const express = require("express");
const path = require("path");
const game = require("../OnlineGame");

const app = express();
const port = Number(process.env.PORT) || 4176;
let state = null;

app.use(express.json());
app.use(express.static(path.resolve(__dirname, "..")));

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
