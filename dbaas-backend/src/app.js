// src/app.js
const express = require('express');
const bodyParser = require('body-parser');
const containerRoutes = require('./routes/containers');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// Routes
app.use('/api/containers', containerRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
