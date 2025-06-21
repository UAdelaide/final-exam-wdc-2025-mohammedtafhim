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
  password: '', // enter your MySQL password if needed
  database: 'dog_walking' // your DB name
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

// Other routes if needed
// const walkRoutes = require('./routes/walkRoutes');
// const userRoutes = require('./routes/userRoutes');
// app.use('/api/walks', walkRoutes);
// app.use('/api/users', userRoutes);
// Route to get dogs owned by the logged-in user (for dropdown list)
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
app.get('/api/dogs', (req, res) => {
    const query = 'SELECT * FROM Dogs';

    db.query(query, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json(results);
    });
  });




module.exports = app;
// Logout route: destroys session and redirects to login
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send('Logout failed');
      }
      res.clearCookie('connect.sid'); // clears the session cookie
      res.redirect('/');
    });
  });


