const express = require('express');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2');
const argon2 = require('argon2');
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
  password: '', // change if needed
  database: 'dog_walking' // change if needed
});

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');
app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// LOGIN route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM Users WHERE username = ?';

  db.query(query, [username], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).send('User not found');
    }

    const user = results[0];
    try {
      const valid = await argon2.verify(user.password_hash, password);
      if (!valid) return res.status(401).send('Invalid password');

      req.session.user = user;

      // Redirect based on role
      if (user.role === 'owner') {
        res.redirect('/owner-dashboard.html');
      } else if (user.role === 'walker') {
        res.redirect('/walker-dashboard.html');
      } else {
        res.status(403).send('Unknown role');
      }
    } catch (e) {
      res.status(500).send('Login failed');
    }
  });
});

module.exports = app;
