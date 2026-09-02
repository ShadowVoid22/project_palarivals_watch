const express = require("express");
const path = require("path");
const database = require("./Database");
const authHandler = require("./api/auth");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.all("/api/auth", authHandler);

app.get("/api/getusers", async (req, res) => {
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

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "Main.html"));
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
    console.log(`Running on port ${port}`);
});
