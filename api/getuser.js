const database = require("../Database");

module.exports = async (req, res) => {
    try {
        const users = await database.getUsers();

        return res.status(200).json(users);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: error.message
        });
    }
};