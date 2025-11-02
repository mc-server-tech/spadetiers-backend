const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

// In-memory "database"
const users = [];

// Default gamemodes
const gamemodes = ["sword", "axe", "uhc", "mace", "crystal", "smp", "pot", "neth pot"];

// Tier points
const tierPoints = {
  lt5: 10, ht5: 20, lt4: 30, ht4: 40, lt3: 50,
  ht3: 60, lt2: 70, ht2: 80, lt1: 90, ht1: 100
};

// Root route
app.get("/", (req, res) => res.send("MCTiers backend running!"));

// --- Auth routes ---
app.post("/api/auth/register", async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: "Missing fields" });

  if (users.find(u => u.username === username)) return res.status(400).json({ error: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);
  users.push({ username, password: hashed, role, tiers: {} });
  res.json({ message: "User registered" });
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).json({ error: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: "Wrong password" });

  const token = jwt.sign({ username, role: user.role }, "secret", { expiresIn: "1h" });
  res.json({ token });
});

// --- Gamemodes ---
app.get("/api/gamemodes", (req, res) => res.json(gamemodes));

// --- Tiers ---
app.get("/api/tiers", (req, res) => {
  const sampleTiers = {};
  gamemodes.forEach(mode => sampleTiers[mode] = "lt5"); // default

  const tierWithPoints = {};
  let overallPoints = 0;
  for (const [mode, tier] of Object.entries(sampleTiers)) {
    const points = tierPoints[tier] || 0;
    tierWithPoints[mode] = { tier, points };
    overallPoints += points;
  }

  res.json({ tiers: tierWithPoints, overallPoints });
});

// --- Auth middleware ---
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const user = jwt.verify(token, "secret");
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- MOD: Edit user tiers ---
app.put("/api/tiers/:username", authenticate, (req, res) => {
  if (!["mod","owner"].includes(req.user.role)) return res.status(403).json({ error: "Unauthorized" });

  const { username } = req.params;
  const { tiers } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.tiers = tiers;
  res.json({ message: "Tiers updated", tiers: user.tiers });
});

// --- OWNER: Edit gamemodes ---
app.put("/api/gamemodes", authenticate, (req, res) => {
  if (req.user.role !== "owner") return res.status(403).json({ error: "Unauthorized" });

  const { newGamemodes } = req.body;
  if (!Array.isArray(newGamemodes)) return res.status(400).json({ error: "Invalid gamemodes" });

  gamemodes.length = 0;
  gamemodes.push(...newGamemodes);
  res.json({ message: "Gamemodes updated", gamemodes });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
