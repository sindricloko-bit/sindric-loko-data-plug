// server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// This will serve all files (like index.html and main.html) from the root directory
// This is the correct setup for your current file structure.
app.use(express.static(path.join(__dirname, '')));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});