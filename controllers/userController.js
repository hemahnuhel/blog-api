const User = require('../models/User');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

// Sign up
exports.signup = async (req, res) => {
  const { first_name, last_name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({ first_name, last_name, email, password });
    await user.save();

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {console.error('SIGNUP ERROR:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      msg: 'Server error', 
      error: err.message || 'Unknown error' 
    });
  }
};

// Sign in
exports.signin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {console.error('SIGNUP ERROR:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      msg: 'Server error', 
      error: err.message || 'Unknown error' 
    });
  }
};