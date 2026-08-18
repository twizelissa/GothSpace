const express = require('express');
const cors = require('cors');
const routes = require('../server/routes.cjs');

const app = express();
app.use(cors());
app.use(express.json());

// Mount the Express routes directly
app.use('/api', routes);

module.exports = app;
