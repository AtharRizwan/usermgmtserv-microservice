const express = require('express');
const bcrypt = require('bcryptjs');
const { SignJWT } = require('jose');
const User = require('../models/User');
const router = express.Router();

// Reject missing or non-string credentials (also blocks query-operator injection like {"$ne": null})
const validateCredentials = (req, res, next) => {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    next();
};

// Register User
router.post('/register', validateCredentials, async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if user exists
        let user = await User.findOne({ username });
        if (user) return res.status(400).json({ message: 'User already exists' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save user
        user = new User({ username, password: hashedPassword });
        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        // Concurrent registration of the same username hits the unique index
        if (err.code === 11000) return res.status(400).json({ message: 'User already exists' });
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login User
router.post('/login', validateCredentials, async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        // Generate token
        const token = await new SignJWT({ id: user.id })
            .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(new TextEncoder().encode(process.env.JWT_SECRET));
        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
