const express = require('express');
const cookieParser = require('cookie-parser');
const authRouter = require('./routes/auth.routes');

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRouter);

module.exports = app;