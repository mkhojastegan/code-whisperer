require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001; // Using port 3001 for the backend

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello from the Code Whisperer Backend!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});