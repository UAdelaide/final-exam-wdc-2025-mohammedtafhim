// app.js (in part1 folder)
const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const PORT = 8080;

let db;

// Connect to MySQL and insert starter data on app launch
async function startServer() {
  try {
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService'
    });

    console.log('Connected to MySQL');

    // Insert sample data (if needed for testing)
    await db.execute(`INSERT IGNORE INTO Users (username, email, password_hash, role) VALUES
      ('alice123', 'alice@example.com', 'hashed123', 'owner'),
      ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
      ('carol123', 'carol@example.com', 'hashed789', 'owner')
    `);

    // Routes
    app.get('/api/dogs', async (req, res) => {
      try {
        const [rows] = await db.execute(`
          SELECT Dogs.name AS dog_name, Dogs.size, Users.username AS owner_username
          FROM Dogs
          JOIN Users ON Dogs.owner_id = Users.user_id
        `);
        res.json(rows);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch dogs.' });
      }
    });

    app.get('/api/walkrequests/open', async (req, res) => {
      try {
        const [rows] = await db.execute(`
          SELECT WalkRequests.request_id, Dogs.name AS dog_name, WalkRequests.requested_time,
                 WalkRequests.duration_minutes, WalkRequests.location, Users.username AS owner_username
          FROM WalkRequests
          JOIN Dogs ON WalkRequests.dog_id = Dogs.dog_id
          JOIN Users ON Dogs.owner_id = Users.user_id
          WHERE WalkRequests.status = 'open'
        `);
        res.json(rows);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch open walk requests.' });
      }
    });

    app.get('/api/walkers/summary', async (req, res) => {
      try {
        const [rows] = await db.execute(`
          SELECT u.username AS walker_username,
                 COUNT(r.rating_id) AS total_ratings,
                 ROUND(AVG(r.rating), 1) AS average_rating,
                 COUNT(wr.request_id) AS completed_walks
          FROM Users u
          LEFT JOIN WalkRatings r ON u.user_id = r.walker_id
          LEFT JOIN WalkRequests wr ON u.user_id = wr.dog_id AND wr.status = 'completed'
          WHERE u.role = 'walker'
          GROUP BY u.username
        `);
        res.json(rows);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch walker summary.' });
      }
    });

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Startup error:', err);
  }
}

startServer();
