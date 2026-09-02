-- Run once against the PalaRivals Watch SQL Server database before enabling account creation.
-- Existing plaintext passwords remain readable by the compatibility login and are upgraded
-- to a scrypt hash automatically after that player logs in successfully.

alter table Users
alter column Password nvarchar(255) not null;

if not exists (
    select 1
    from sys.indexes
    where name = 'UX_Users_Username'
      and object_id = object_id('Users')
)
begin
    create unique index UX_Users_Username on Users (Username);
end;
