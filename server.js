import express from "express";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = "./data.json";

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], tiers: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.post("/register", (req, res) => {
  const { username, password } = req.body;
  const data = loadData();

  if (data.users.find(u => u.username === username)) {
    return res.status(400).json({ error: "User already exists" });
  }

  const role = username === "sussytech" ? "owner" : "player";
  data.users.push({ username, password, role });
  saveData(data);

  res.json({ success: true, role });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const data = loadData();

  const user = data.users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  res.json({ success: true, user });
});

app.get("/tiers", (req, res) => {
  const data = loadData();
  res.json(data.tiers);
});

app.post("/tiers", (req, res) => {
  const { gamemode, username, tier } = req.body;
  const data = loadData();

  if (!data.tiers[gamemode]) data.tiers[gamemode] = {};
  data.tiers[gamemode][username] = tier;
  saveData(data);

  res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
