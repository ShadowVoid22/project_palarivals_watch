const sql = require("mssql");
const path = require("path");
const dotenv = require("dotenv");

// Vercel's CLI writes pulled development variables to .env.local. Load that
// file first for `npm start`, while retaining .env as a local fallback.
dotenv.config({ path: path.join(__dirname, ".env.local"), quiet: true });
dotenv.config({ path: path.join(__dirname, ".env"), quiet: true });

const requiredDatabaseVariables = ["DB_USER", "DB_PASSWORD", "DB_SERVER", "DB_DATABASE"];

function getMissingDatabaseVariables() {
    return requiredDatabaseVariables.filter((name) => !String(process.env[name] || "").trim());
}

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT) || 1433,

    options: {
        encrypt: true
    }
};

let poolPromise;
let authSchemaPromise;

function getPool() {
    const missingVariables = getMissingDatabaseVariables();
    if (missingVariables.length) {
        const error = new Error(`Missing database environment variables: ${missingVariables.join(", ")}`);
        error.code = "DATABASE_CONFIG_MISSING";
        error.missingVariables = missingVariables;
        throw error;
    }

    if (!poolPromise) {
        poolPromise = sql.connect(config).catch((error) => {
            poolPromise = null;
            throw error;
        });
    }

    return poolPromise;
}

function ensureAuthSchema() {
    if (!authSchemaPromise) {
        authSchemaPromise = (async () => {
            const pool = await getPool();

            await pool.request().query(`
                if object_id(N'Users', N'U') is null
                    throw 51001, 'The Users table does not exist.', 1;

                if col_length('Users', 'Password') < 255
                    alter table Users alter column Password nvarchar(255) not null;

                if not exists (
                    select 1
                    from sys.indexes
                    where name = 'UX_Users_Username'
                      and object_id = object_id('Users')
                )
                begin
                    if exists (
                        select Username
                        from Users
                        group by Username
                        having count(*) > 1
                    )
                        throw 51002, 'Duplicate usernames must be resolved before creating the unique index.', 1;

                    create unique index UX_Users_Username on Users (Username);
                end;
            `);
        })().catch((error) => {
            authSchemaPromise = null;
            throw error;
        });
    }

    return authSchemaPromise;
}

async function getHeroes() {
    const pool = await getPool();

    const result = await pool.request().query(`
        select *
        from Heroes
    `);

    return result.recordset;
}

async function getHeroID(Hero) {
    const pool = await getPool();
    
    const result = await pool.request()
    .input("hero", sql.VarChar, Hero)
    .query(`
        select HeroID from Heroes where HeroName = @hero
    `);

    return result.recordset;
}

async function getUsers(Username) {
    const pool = await getPool();

    let request = pool.request();
    let query = `select UserID, Username from Users`;

    if (Username !== undefined) {
        query += ` where Username = @username`;
        request.input("username", sql.VarChar, Username);
    }

    const result = await request.query(query);

    return result.recordset;
}

async function addUser(Username, Password) {
    const pool = await getPool();

    const result = await pool.request()
        .input("username", sql.NVarChar(50), Username)
        .input("password", sql.NVarChar(255), Password)
        .query(`
            insert into Users (Username, Password)
            output inserted.UserID, inserted.Username
            values (@username, @password)
            `);

    return result.recordset[0];
}

async function getUserForAuth(Username) {
    const pool = await getPool();

    const result = await pool.request()
        .input("username", sql.NVarChar(50), Username)
        .query(`
            select top 1 UserID, Username, Password
            from Users
            where Username = @username
        `);

    return result.recordset[0] || null;
}

async function updateUserPassword(Username, Password) {
    const pool = await getPool();

    await pool.request()
        .input("username", sql.NVarChar(50), Username)
        .input("password", sql.NVarChar(255), Password)
        .query(`
            update Users
            set Password = @password
            where Username = @username
        `);
}

async function getUserID(Username) {
    const pool = await getPool();
    
    const result = await pool.request()
    .input("username", sql.VarChar, Username)
    .query(`
        select UserID from Users where Username = @username
    `);

    return result.recordset;
}

async function getUsersHeroes() {
    const pool = await getPool();

    const result = await pool.request().query(`
            select *
            from UsersHeroes
    `);

    return result.recordset;
}


module.exports = {
    getHeroes,
    getHeroID,
    getUsers,
    addUser,
    ensureAuthSchema,
    getUserForAuth,
    updateUserPassword,
    getUserID,
    getUsersHeroes
};
