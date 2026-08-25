const database = require("../Database");

module.exports = async (req, res) => {
        
    if (req.method !== "GET") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {
        const users = await database.getUsers();

        res.json(users);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database error"
        });
    }
};
