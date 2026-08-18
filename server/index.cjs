const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes.cjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ message: "GOTH Space Helper API is running." });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  GOTH Space Helper Server is running on port ${PORT}`);
  console.log(`  Local URL: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
