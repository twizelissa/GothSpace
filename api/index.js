const express = require('express');
const cors = require('cors');
const routes = require('../server/routes.cjs');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Support both /api prefix and root level routing for Vercel Serverless Rewrites
app.use('/api', routes);
app.use('/', routes);

module.exports = app;
