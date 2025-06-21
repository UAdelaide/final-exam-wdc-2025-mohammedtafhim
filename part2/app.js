const express = require('express');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2');
const fetch = require('node-fetch'); // For fetching dog.ceo API
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

// Login route
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

// /api/users/me to get current user session
app.get('/api/users/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(req.session.user);
});

// /api/walks/mydogs to get dogs for dropdown
app.get('/api/walks/mydogs', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ownerId = req.session.user.user_id;
  const query = 'SELECT dog_id, name, size FROM Dogs WHERE owner_id = ?';

  db.query(query, [ownerId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// /api/dogs for homepage dog table
app.get('/api/dogs', (req, res) => {
  const query = 'SELECT * FROM Dogs';
  db.query(query, async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    try {
      const dogsWithPhotos = await Promise.all(results.map(async dog => {
        try {
          const photoRes = await fetch('https://dog.ceo/api/breeds/image/random');
          const photoData = await photoRes.json();
          dog.photo = photoData.message;
        } catch {
          dog.photo = 'https://via.placeholder.com/100';
        }
        return dog;
      }));

      res.json(dogsWithPhotos);
    } catch (e) {
      res.status(500).json({ error: 'Failed to process dog images' });
    }
  });
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('Logout failed');
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

module.exports = app;
