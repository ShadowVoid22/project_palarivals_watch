const sql = require("mssql");
require("dotenv").config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT),

    options: {
        encrypt: true
    }
};

const poolPromise = sql.connect(config);

async function getHeroes() {
    const pool = await poolPromise;

    const result = await pool.request().query(`
        select *
        from Heroes
    `);

    return result.recordset;
}

async function getHeroID(Hero) {
    const pool = await poolPromise;
    
    const result = await pool.request();
    .input("hero", sql.VarChar, Hero)
    .query(`
        select HeroID from Heroes where HeroName = @hero
    `);

    return result.recordset;
}

async function getUsers(Username) {
    const pool = await poolPromise;

    let request = pool.request();
    let query = `select * from Users`;

    if (Username !== undefined) {
        query += ` where Username = @username`;
        request.input("username", sql.VarChar, Username);
    }

    const result = await request.query(query);

    return result.recordset;
}

async function addUser(Username, Password) {
    const pool = await poolPromise;

    const result = await pool.request()
        .input("username", sql.VarChar, Username)
        .input("password", sql.VarChar, Password)
        .query(`
            insert into Users (Username, Password) 
            values (@username, @password)
            `);
}

async function getUserID(Username) {
    const pool = await poolPromise;
    
    const result = await pool.request()
    .input("username", sql.VarChar, Username)
    .query(`
        select UserID from Users where Username = @username
    `);

    return result.recordset;
}

async function getUsersHeroes() {
    const pool = await poolPromise;

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
    getUserID,
    getUsersHeroes
};