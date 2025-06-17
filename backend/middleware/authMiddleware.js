const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    const token = req.cookeis.session_token;

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user id to the request object
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.error(error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

module.exports = { protect };