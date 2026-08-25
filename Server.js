const express = require("express");
const database = require("./database");

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.get("/api/getuser", async (req, res) => {
    try {
        const users = await database.getUsers();

        res.json(users);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database error"
        });
    }
});

app.listen(3000, () => {
    console.log("Running on port 3000");
});