const sql = require("mssql");
require("dotenv").config();

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

function getPool() {
    if (!poolPromise) {
        poolPromise = sql.connect(config).catch((error) => {
            poolPromise = null;
            throw error;
        });
    }

    return poolPromise;
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
    getUserForAuth,
    updateUserPassword,
    getUserID,
    getUsersHeroes
};
