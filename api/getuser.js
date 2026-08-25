const database = require("../database");

module.exports = async (req, res) => {
    try {
        const users = await database.getUsers();

        res.status(200).json(users);
    } catch (error) {
        console.error("DATABASE ERROR:");
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
};