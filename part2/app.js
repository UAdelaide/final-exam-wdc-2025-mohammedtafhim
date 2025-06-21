const express = require('express');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2');
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
  password: '', // your MySQL password if any
  database: 'dog_walking' // make sure this matches your database name
});

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');
app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// LOGIN route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM Users WHERE username = ?';

  db.query(query, [username], (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).send('User not found');
    }

    const user = results[0];

    // Plain password check (for fake hash like 'hashedpassword123')
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

module.exports = app;
