const database = require("../Database");

module.exports = async (req, res) => {
        
    if (req.method !== "GET") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {
        const username = req.query.username;
        const users = await database.getUserID(username);

        res.json(users[0] || null);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database error"
        });
    }
};
