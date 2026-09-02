"use strict";

const sql = require("mssql");
const database = require("./Database");

let onlineSchemaPromise;

function ensureOnlineSchema() {
    if (!onlineSchemaPromise) {
        onlineSchemaPromise = (async () => {
            const pool = await database.getPool();
            await pool.request().query(`
                if object_id(N'OnlineMatches', N'U') is null
                begin
                    create table OnlineMatches (
                        MatchID uniqueidentifier not null primary key,
                        Status nvarchar(20) not null,
                        StateJson nvarchar(max) not null,
                        Version int not null constraint DF_OnlineMatches_Version default (1),
                        CreatedAt datetime2 not null constraint DF_OnlineMatches_CreatedAt default (sysutcdatetime()),
                        UpdatedAt datetime2 not null constraint DF_OnlineMatches_UpdatedAt default (sysutcdatetime()),
                        ExpiresAt datetime2 not null
                    );

                    create index IX_OnlineMatches_Matchmaking
                        on OnlineMatches (Status, CreatedAt)
                        include (ExpiresAt);
                end;
            `);
        })().catch((error) => {
            onlineSchemaPromise = null;
            throw error;
        });
    }

    return onlineSchemaPromise;
}

function parseState(value) {
    const state = JSON.parse(value);
    if (!state || typeof state !== "object" || !Array.isArray(state.players)) {
        throw new Error("Online match state is invalid.");
    }
    return state;
}

async function joinOrCreate({ createState, joinState }) {
    await ensureOnlineSchema();
    const pool = await database.getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
        const waitingResult = await new sql.Request(transaction).query(`
            select top 1 MatchID, StateJson
            from OnlineMatches with (updlock, holdlock, rowlock)
            where Status = N'waiting'
              and ExpiresAt > sysutcdatetime()
            order by CreatedAt asc;
        `);

        const waitingRow = waitingResult.recordset[0];
        let joined = null;

        if (waitingRow) {
            const waitingState = parseState(waitingRow.StateJson);
            joined = await joinState(waitingState);

            if (joined) {
                await new sql.Request(transaction)
                    .input("matchId", sql.UniqueIdentifier, waitingRow.MatchID)
                    .input("status", sql.NVarChar(20), joined.state.status)
                    .input("state", sql.NVarChar(sql.MAX), JSON.stringify(joined.state))
                    .query(`
                        update OnlineMatches
                        set Status = @status,
                            StateJson = @state,
                            Version = Version + 1,
                            UpdatedAt = sysutcdatetime(),
                            ExpiresAt = dateadd(hour, 4, sysutcdatetime())
                        where MatchID = @matchId;
                    `);
            }
        }

        if (!joined) {
            joined = await createState();
            await new sql.Request(transaction)
                .input("matchId", sql.UniqueIdentifier, joined.state.id)
                .input("status", sql.NVarChar(20), joined.state.status)
                .input("state", sql.NVarChar(sql.MAX), JSON.stringify(joined.state))
                .query(`
                    insert into OnlineMatches (MatchID, Status, StateJson, ExpiresAt)
                    values (@matchId, @status, @state, dateadd(hour, 4, sysutcdatetime()));
                `);
        }

        await transaction.commit();
        return joined;
    } catch (error) {
        await transaction.rollback().catch(() => {});
        throw error;
    }
}

async function mutateMatch(matchId, mutator) {
    await ensureOnlineSchema();
    const pool = await database.getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
        const result = await new sql.Request(transaction)
            .input("matchId", sql.UniqueIdentifier, matchId)
            .query(`
                select MatchID, StateJson
                from OnlineMatches with (updlock, holdlock, rowlock)
                where MatchID = @matchId
                  and ExpiresAt > sysutcdatetime();
            `);

        const row = result.recordset[0];
        if (!row) {
            const error = new Error("Online match was not found or has expired.");
            error.code = "ONLINE_MATCH_NOT_FOUND";
            throw error;
        }

        const state = parseState(row.StateJson);
        const value = await mutator(state);

        await new sql.Request(transaction)
            .input("matchId", sql.UniqueIdentifier, matchId)
            .input("status", sql.NVarChar(20), state.status)
            .input("state", sql.NVarChar(sql.MAX), JSON.stringify(state))
            .query(`
                update OnlineMatches
                set Status = @status,
                    StateJson = @state,
                    Version = Version + 1,
                    UpdatedAt = sysutcdatetime(),
                    ExpiresAt = dateadd(hour, 4, sysutcdatetime())
                where MatchID = @matchId;
            `);

        await transaction.commit();
        return { state, value };
    } catch (error) {
        await transaction.rollback().catch(() => {});
        throw error;
    }
}

module.exports = { ensureOnlineSchema, joinOrCreate, mutateMatch };
