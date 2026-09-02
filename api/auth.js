const crypto = require("crypto");
const database = require("../Database");
const { createSessionToken } = require("../AuthSession");

const scrypt = (password, salt) => new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, (error, key) => {
        if (error) reject(error);
        else resolve(key);
    });
});

function sendJson(response, status, payload) {
    response.status(status).json(payload);
}

function normalizeBody(request) {
    if (request.body && typeof request.body === "object") return request.body;

    if (typeof request.body === "string") {
        try {
            return JSON.parse(request.body);
        } catch {
            return {};
        }
    }

    return {};
}

function validateCredentials(username, password) {
    if (username.length < 3 || username.length > 50) {
        return "Username must be between 3 and 50 characters.";
    }

    if (password.length < 6 || password.length > 30) {
        return "Password must be between 6 and 30 characters.";
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
        return "Password must contain an uppercase letter, a lowercase letter, and a number.";
    }

    return null;
}

async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("base64url");
    const key = await scrypt(password, salt);
    return `scrypt$${salt}$${key.toString("base64url")}`;
}

async function verifyPassword(password, storedPassword) {
    if (typeof storedPassword !== "string") return { valid: false, legacy: false };

    const [scheme, salt, encodedKey] = storedPassword.split("$");
    if (scheme === "scrypt" && salt && encodedKey) {
        const expected = Buffer.from(encodedKey, "base64url");
        const supplied = await scrypt(password, salt);
        return {
            valid: expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied),
            legacy: false,
        };
    }

    const expected = Buffer.from(storedPassword);
    const supplied = Buffer.from(password);
    return {
        valid: expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied),
        legacy: true,
    };
}

function publicUser(user) {
    return {
        id: user.UserID,
        username: user.Username,
        token: createSessionToken(user),
    };
}

function getSqlErrorNumber(error) {
    const candidates = [
        error?.number,
        error?.originalError?.number,
        error?.originalError?.info?.number,
        error?.precedingErrors?.[0]?.number,
    ];
    const number = candidates.map(Number).find(Number.isFinite);
    return number ?? null;
}

function isAuthSchemaError(error) {
    return [207, 208, 8152, 2628, 51001, 51002].includes(getSqlErrorNumber(error));
}

function describeDatabaseFailure(error, action) {
    const number = getSqlErrorNumber(error);
    const operation = action === "signup" ? "Account creation" : "Login";

    if (number === 229) {
        return {
            code: "DATABASE_PERMISSION_DENIED",
            error: `${operation} was blocked by SQL Server permissions. Grant the configured DB_USER SELECT, INSERT, and UPDATE permission on the Users table.`,
        };
    }

    if (number === 515) {
        return {
            code: "DATABASE_REQUIRED_COLUMN",
            error: "The Users table has a required column without a default value. Check the Vercel Function Log for the column name.",
        };
    }

    if (number === 547) {
        return {
            code: "DATABASE_CONSTRAINT_REJECTED",
            error: "The Users table rejected the new account because of a database constraint.",
        };
    }

    if (number === 334) {
        return {
            code: "DATABASE_TRIGGER_OUTPUT_CONFLICT",
            error: "The Users table trigger conflicted with the account insert. Deploy the trigger-safe account API update.",
        };
    }

    if ([245, 8114].includes(number)) {
        return {
            code: "DATABASE_COLUMN_TYPE_MISMATCH",
            error: "The Users table column types do not match the account API.",
        };
    }

    if (["ELOGIN", "ETIMEOUT", "ESOCKET", "ECONNCLOSED", "ENOTOPEN"].includes(error?.code)) {
        return {
            code: `DATABASE_${error.code}`,
            error: `${operation} could not connect to SQL Server (${error.code}). Check the Vercel database credentials, firewall, and server availability.`,
        };
    }

    return {
        code: number ? `DATABASE_SQL_${number}` : "DATABASE_REQUEST_FAILED",
        error: number
            ? `${operation} was rejected by SQL Server (error ${number}). Check the matching Vercel Function Log for details.`
            : `${operation} failed in the account database. Check the matching Vercel Function Log for details.`,
    };
}

module.exports = async (request, response) => {
    if (request.method !== "POST") {
        response.setHeader("Allow", "POST");
        return sendJson(response, 405, { error: "Method not allowed." });
    }

    const body = normalizeBody(request);
    const action = typeof body.action === "string" ? body.action.toLowerCase() : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const validationError = validateCredentials(username, password);

    if (!['login', 'signup'].includes(action)) {
        return sendJson(response, 400, { error: "Choose login or signup." });
    }

    if (validationError) {
        return sendJson(response, 400, { error: validationError });
    }

    try {
        const existingUser = await database.getUserForAuth(username);

        if (action === "signup") {
            if (existingUser) {
                return sendJson(response, 409, { error: "That username is already registered." });
            }

            await database.ensureAuthSchema();
            const passwordHash = await hashPassword(password);
            const createdUser = await database.addUser(username, passwordHash);
            return sendJson(response, 201, {
                message: "Account created. Identity link established.",
                user: publicUser(createdUser),
            });
        }

        if (!existingUser) {
            return sendJson(response, 401, { error: "Incorrect username or password." });
        }

        const passwordResult = await verifyPassword(password, existingUser.Password);
        if (!passwordResult.valid) {
            return sendJson(response, 401, { error: "Incorrect username or password." });
        }

        let passwordUpgradePending = false;
        if (passwordResult.legacy) {
            try {
                await database.ensureAuthSchema();
                await database.updateUserPassword(existingUser.Username, await hashPassword(password));
            } catch (error) {
                if (!isAuthSchemaError(error)) throw error;
                passwordUpgradePending = true;
                console.error("Legacy password upgrade requires the account schema migration.", error.number);
            }
        }

        return sendJson(response, 200, {
            message: passwordUpgradePending
                ? "Login successful. Account security upgrade is pending administrator maintenance."
                : "Login successful. Welcome back.",
            user: publicUser(existingUser),
        });
    } catch (error) {
        const sqlErrorNumber = getSqlErrorNumber(error);

        if (sqlErrorNumber === 2601 || sqlErrorNumber === 2627) {
            return sendJson(response, 409, { error: "That username is already registered." });
        }

        if (error?.code === "DATABASE_CONFIG_MISSING") {
            console.error("Authentication database is not configured.", error.missingVariables);
            return sendJson(response, 503, {
                error: `The account database is not configured. Add ${error.missingVariables.join(", ")} to the Vercel project or local .env.local file.`,
                code: error.code,
            });
        }

        if (isAuthSchemaError(error)) {
            console.error("Authentication database schema is outdated.", sqlErrorNumber, error);
            return sendJson(response, 503, {
                error: "The account database needs its one-time security migration before new accounts can be created.",
                code: "AUTH_SCHEMA_MIGRATION_REQUIRED",
            });
        }

        console.error("Authentication API failed.", error);
        return sendJson(response, 503, describeDatabaseFailure(error, action));
    }
};

module.exports._internals = {
    validateCredentials,
    hashPassword,
    verifyPassword,
    getSqlErrorNumber,
    isAuthSchemaError,
    describeDatabaseFailure,
};
