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
