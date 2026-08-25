module.exports = async (req, res) => {
    try {
        const database = require("../database");

        console.log("Database module loaded");

        const users = await database.getUsers();

        console.log("Users retrieved");

        return res.status(200).json(users);

    } catch (error) {
        console.error("================================");
        console.error("GETUSER ERROR");
        console.error(error);
        console.error("================================");

        return res.status(500).json({
            error: error.message,
            name: error.name,
            stack: error.stack
        });
    }
};