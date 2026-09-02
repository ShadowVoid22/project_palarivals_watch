const crypto = require("crypto");
const database = require("../Database");

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

        if (passwordResult.legacy) {
            await database.updateUserPassword(existingUser.Username, await hashPassword(password));
        }

        return sendJson(response, 200, {
            message: "Login successful. Welcome back.",
            user: publicUser(existingUser),
        });
    } catch (error) {
        if (error?.number === 2601 || error?.number === 2627) {
            return sendJson(response, 409, { error: "That username is already registered." });
        }

        console.error("Authentication API failed.", error);
        return sendJson(response, 503, {
            error: "The account service is unavailable. Check the database environment settings and try again.",
        });
    }
};

module.exports._internals = { validateCredentials, hashPassword, verifyPassword };
