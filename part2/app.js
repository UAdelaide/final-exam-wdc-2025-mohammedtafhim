const express = require('express');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/public')));
app.use(session({
  secret: 'doggySecret123',
  resave: false,
  saveUninitialized: false
}));

// DB connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dog_walking'
});

// LOGIN route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM Users WHERE username = ?';

  db.query(query, [username], (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).send('User not found');
    }

    const user = results[0];
    if (user.password_hash !== password) {
      return res.status(401).send('Incorrect password');
    }

    req.session.user = user;
    if (user.role === 'owner') {
      res.redirect('/owner-dashboard.html');
    } else if (user.role === 'walker') {
      res.redirect('/walker-dashboard.html');
    } else {
      res.status(403).send('Unknown role');
    }
  });
});

// Route to get dogs owned by the logged-in user (for dropdown list)
app.get('/api/walks', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.session.user.user_id;
  const query = `
    SELECT WalkRequests.*, Dogs.name AS dog_name, Dogs.size
    FROM WalkRequests
    JOIN Dogs ON WalkRequests.dog_id = Dogs.dog_id
    WHERE Dogs.owner_id = ?
    ORDER BY WalkRequests.requested_time DESC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});


// Route to get all dogs with random photos
app.get('/api/dogs', (req, res) => {
  const query = 'SELECT * FROM Dogs';

  db.query(query, async (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    try {
      const dogsWithPhotos = await Promise.all(results.map(async (dog) => {
        try {
          const response = await fetch('https://dog.ceo/api/breeds/image/random');
          const data = await response.json();
          dog.photo = data.message;
        } catch {
          dog.photo = 'https://via.placeholder.com/100';
        }
        return dog;
      }));

      return res.json(dogsWithPhotos);
    } catch (e) {
      return res.status(500).json({ error: 'Image fetch failed' });
    }
  });
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Logout failed');
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

module.exports = app;