const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google-signin', async (req, res) => {
    const { token } = req.body

    try {
        // Verify the token from Google
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { sub: googleId, email, name } = payload;

        // Find or create the user in our database (Upsert)
        const user = await prisma.user.upsert({
            where: { id: googleId },
            update: { name }, // Update name if it has changed on google
            create: { id: googleId, email, name },
        });

        // Create our own JWT session token
        const sessionToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
            expiresIn: '7d', // Token expires in 7 days
        })

        // Send the token back to the client in a secure, httpOnly cookie
        res.cookie('session_token', sessionToken, {
            httpOnly: true, // Prevent client-side JS from accessing the cookie
            secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(200).json({ message: "Authentication successful", user });

    } catch (error) {
        console.error("Authentication error:", error);
        res.status(401).json({ error: "Invalid token or authentication failed." });
    }
});

router.get('/me', protect, async (req, res) => {
    // If this passes, we know the user is authenticated
    // The user's ID is attached to req.userId
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error retrieving user.', error });
    }
});

router.post('/logout', (req, res) => {
    res.cookie('session_token', '', {
        httpOnly: true,
        expires: new Date(0), // Set the cookie to expire immediately
    });
    res.status(200).json({ message: 'Logged out user successfully' });
});

module.exports = router;