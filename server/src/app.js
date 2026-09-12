const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./middleware/errorHandler');

// Module routers
const eventsRouter = require('./modules/events/events.routes');
const helpRouter = require('./modules/help/help.routes');
const mentorRouter = require('./modules/mentor/mentor.routes');

const app = express();

// Global middleware
// credentials: true is required for cookie-based sessions — the frontend
// sends fetch(..., { credentials: 'include' }) on every request, and CORS
// requires an explicit origin (not '*') whenever credentials are involved.
app.use(cors({ origin: process.env.APP_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'dev-secret-change-me'));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Mount module routes
app.use('/api', eventsRouter);
app.use('/api', helpRouter);
app.use('/api', mentorRouter);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
