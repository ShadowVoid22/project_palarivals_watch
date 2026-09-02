"use strict";

const sql = require("mssql");
const database = require("./Database");

let profileSchemaPromise;

function ensureProfileSchema() {
    if (!profileSchemaPromise) {
        profileSchemaPromise = (async () => {
            const pool = await database.getPool();
            await pool.request().query(`
                if object_id(N'dbo.ProfileMatches', N'U') is null
                begin
                    create table dbo.ProfileMatches (
                        UserKey nvarchar(128) not null,
                        MatchKey nvarchar(128) not null,
                        Mode nvarchar(40) not null,
                        Outcome nvarchar(10) not null,
                        PlayedAt datetime2 not null constraint DF_ProfileMatches_PlayedAt default (sysutcdatetime()),
                        constraint PK_ProfileMatches primary key (UserKey, MatchKey),
                        constraint CK_ProfileMatches_Outcome check (Outcome in (N'win', N'loss', N'draw'))
                    );
                    create index IX_ProfileMatches_UserPlayedAt on dbo.ProfileMatches (UserKey, PlayedAt desc);
                end;

                if object_id(N'dbo.ProfileHeroUsage', N'U') is null
                begin
                    create table dbo.ProfileHeroUsage (
                        UserKey nvarchar(128) not null,
                        HeroID nvarchar(64) not null,
                        TimesUsed int not null constraint DF_ProfileHeroUsage_TimesUsed default (0),
                        constraint PK_ProfileHeroUsage primary key (UserKey, HeroID)
                    );
                end;
            `);
        })().catch((error) => {
            profileSchemaPromise = null;
            throw error;
        });
    }
    return profileSchemaPromise;
}

async function getStats(userKey) {
    await ensureProfileSchema();
    const pool = await database.getPool();
    const result = await pool.request()
        .input("userKey", sql.NVarChar(128), userKey)
        .query(`
            select
                count(*) as Matches,
                coalesce(sum(case when Outcome = N'win' then 1 else 0 end), 0) as Wins,
                coalesce(sum(case when Outcome = N'loss' then 1 else 0 end), 0) as Losses,
                coalesce(sum(case when Outcome = N'draw' then 1 else 0 end), 0) as Draws
            from dbo.ProfileMatches
            where UserKey = @userKey;

            select top 9 HeroID, TimesUsed
            from dbo.ProfileHeroUsage
            where UserKey = @userKey
            order by TimesUsed desc, HeroID asc;
        `);

    const totals = result.recordsets[0]?.[0] || {};
    const matches = Number(totals.Matches) || 0;
    const wins = Number(totals.Wins) || 0;
    return {
        matches,
        wins,
        losses: Number(totals.Losses) || 0,
        draws: Number(totals.Draws) || 0,
        winRate: matches ? Number(((wins / matches) * 100).toFixed(1)) : 0,
        topHeroes: (result.recordsets[1] || []).map((row) => ({
            heroId: row.HeroID,
            timesUsed: Number(row.TimesUsed) || 0,
        })),
    };
}

async function recordMatch({ userKey, matchKey, mode, outcome, heroes }) {
    await ensureProfileSchema();
    const pool = await database.getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    try {
        const insertResult = await new sql.Request(transaction)
            .input("userKey", sql.NVarChar(128), userKey)
            .input("matchKey", sql.NVarChar(128), matchKey)
            .input("mode", sql.NVarChar(40), mode)
            .input("outcome", sql.NVarChar(10), outcome)
            .query(`
                declare @recorded bit = 0;
                if not exists (
                    select 1 from dbo.ProfileMatches with (updlock, holdlock)
                    where UserKey = @userKey and MatchKey = @matchKey
                )
                begin
                    insert into dbo.ProfileMatches (UserKey, MatchKey, Mode, Outcome)
                    values (@userKey, @matchKey, @mode, @outcome);
                    set @recorded = 1;
                end;
                select @recorded as Recorded;
            `);

        const recorded = Boolean(insertResult.recordset[0]?.Recorded);
        if (recorded) {
            const counts = new Map();
            heroes.forEach((heroId) => counts.set(heroId, (counts.get(heroId) || 0) + 1));
            for (const [heroId, count] of counts) {
                await new sql.Request(transaction)
                    .input("userKey", sql.NVarChar(128), userKey)
                    .input("heroId", sql.NVarChar(64), heroId)
                    .input("count", sql.Int, count)
                    .query(`
                        update dbo.ProfileHeroUsage with (updlock, serializable)
                        set TimesUsed = TimesUsed + @count
                        where UserKey = @userKey and HeroID = @heroId;
                        if @@rowcount = 0
                            insert into dbo.ProfileHeroUsage (UserKey, HeroID, TimesUsed)
                            values (@userKey, @heroId, @count);
                    `);
            }
        }

        await transaction.commit();
        return recorded;
    } catch (error) {
        await transaction.rollback().catch(() => {});
        throw error;
    }
}

module.exports = { ensureProfileSchema, getStats, recordMatch };
