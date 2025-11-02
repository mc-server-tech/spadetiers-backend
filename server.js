// server.js
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors()); // allow frontend to reach backend
app.use(express.json());

const SECRET = process.env.JWT_SECRET || "supersecret";

// --- In-memory storage (replace with database later) ---
let users = []; // { username, passwordHash, role }
let gamemodes = ["sword", "axe", "uhc", "mace", "crystal", "smp", "pot", "neth pot"];
let tiers = {
  lt5: [],
  ht5: [],
  lt4: [],
  ht4: [],
  lt3: [],
  ht3: [],
  lt2: [],
  ht2: [],
  lt1: [],
  ht1: [],
};

// --- Helper to verify token ---
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// --- Routes ---

// Register
app.post("/api/auth/register", async (req, res) => {
  const { username, password, role } = req.body;
  if (users.find(u => u.username === username))
    return res.status(400).json({ error: "Username already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  users.push({ username, passwordHash, role });
  const token = jwt.sign({ username, role }, SECRET, { expiresIn: "1d" });

  res.json({ message: "Registered successfully", token });
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(400).json({ error: "Invalid credentials" });

  const token = jwt.sign({ username, role: user.role }, SECRET, { expiresIn: "1d" });
  res.json({ message: "Logged in successfully", token });
});

// Get gamemodes
app.get("/api/gamemodes", (req, res) => {
  res.json(gamemodes);
});

// Get tiers + overall points
app.get("/api/tiers", (req, res) => {
  const tierPoints = { lt5: 10, ht5: 20, lt4: 30, ht4: 40, lt3: 50, ht3: 60, lt2: 70, ht2: 80, lt1: 90, ht1: 100 };
  const overallPoints = {};
  for (const [tier, players] of Object.entries(tiers)) {
    players.forEach(player => {
      overallPoints[player] = (overallPoints[player] || 0) + tierPoints[tier];
    });
  }

  res.json({ tiers, overallPoints });
});

// Update tiers (owner only)
app.patch("/api/tiers", verifyToken, (req, res) => {
  if (req.user.role !== "owner") return res.status(403).json({ error: "Not allowed" });

  const { updatedTiers } = req.body;
  if (!updatedTiers) return res.status(400).json({ error: "No tiers provided" });

  tiers = updatedTiers;
  res.json({ message: "Tiers updated successfully", tiers });
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
