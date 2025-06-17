require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const snippetRoutes = require('./routes/snippets');

const app = express();
const PORT = process.env.PORT || 3001; // Using port 3001 for the backend

app.use(cors({
    origin: 'http://localhost:5173', // Allow requests from front-end
    credentials: true, // Allow cookies to be set
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/snippets', snippetRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});