require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('./auth');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

const app = express();

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Rate Limiting Middleware
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min window
    max: 100, // Limit each IP to 100 requests
    message: "Too many requests, please try again later."
});
app.use('/weather', apiLimiter);

// Home Route
app.get('/', (req, res) => {
    res.render('home');
});

// Auth Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

const BASE_URL = "https://appsail-50025221249.development.catalystappsail.in";
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        console.log("✅ Google Login Successful! Redirecting...");
        console.log("User Info:", req.user); // Debugging
        res.redirect('/dashboard');
    }
);

// Logout
app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

// Dashboard (Protected)
app.get('/dashboard', isAuthenticated, (req, res) => {
    console.log("🚀 Redirected to Dashboard");
    res.render('dashboard', { user: req.user });
});

// Fetch Weather API Data
app.get('/weather', isAuthenticated, async (req, res) => {
    const city = req.query.city || 'New York'; // Default city

    try {
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
            params: {
                q: city,
                appid: process.env.WEATHER_API_KEY,
                units: 'metric'
            }
        });

        console.log("Weather API Response:", response.data); // Debugging

        if (response.data && response.data.main) {
            const weatherData = {
                city: response.data.name,
                temperature: response.data.main.temp,
                description: response.data.weather[0].description
            };
            return res.json(weatherData);
        } else {
            return res.json({ error: "Invalid response from weather API" });
        }

    } catch (error) {
        console.error('Error fetching weather:', error.message);
        return res.json({ error: "Could not fetch weather data" });
    }
});

// Middleware for Authentication
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/');
}

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start Server
const PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
