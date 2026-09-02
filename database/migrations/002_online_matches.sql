-- Run once against the production SQL Server database before enabling Online Operations.
-- Match state expires automatically and contains no account passwords or database credentials.

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
