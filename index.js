require("dotenv").config();

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}

const express = require("express");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const {validateMonitors} = require('./validators/modelValidators');
const {
    createNewMonitor,
    getMonitorById,
    updateMonitorById,
    deleteMonitorById,
    getAllMonitors,
    createUser,
    getUserByUsername} = require('./db')
const auth = require('./middleware/auth');
// Scheduler is initialized by worker below; these are imported for lifecycle management
let schedulerFns = null;
const app = express();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please try again later.' },
});
app.use(express.json());
app.use((req, res, next) => {
    const origin = req.headers.origin;
    // In production set FRONTEND_ORIGIN to your exact domain.
    // In dev, allow any localhost port so Parcel's random port assignment doesn't break CORS.
    const isAllowed = process.env.FRONTEND_ORIGIN
        ? origin === process.env.FRONTEND_ORIGIN
        : /^http:\/\/localhost(:\d+)?$/.test(origin);

    if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});
app.post('/api/register', authLimiter, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }
    if (username.trim().length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters." });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters." });
    }
    try {
        const existing = await getUserByUsername(username.trim());
        if (existing) {
            return res.status(400).json({ error: "Username already taken." });
        }
        const user = await createUser({ username: username.trim(), password });
        res.status(201).json({ id: user.id, username: user.username });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Registration failed. Please try again." });
    }
});

app.post('/api/login', authLimiter, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }
    try {
        const user = await getUserByUsername(username);
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "Invalid username or password." });
        }
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );
        res.json({ token });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Login failed. Please try again." });
    }
});
app.use(auth);
//Routes and their info
app.post('/api/monitors',validateMonitors,async(req,res)=>{
    const { url, name, interval, statusCodes, method, headers, body } = req.body;
    try{
        const monitor = await createNewMonitor({
            userId: req.user.id,
            url,
            interval,
            name,
            statusCodes,
            method,
            headers,
            body,
        });
        // Start monitoring immediately without waiting for server restart
        if(schedulerFns) schedulerFns.scheduleMonitor(monitor);
        res.status(201).json(monitor);
    }catch(err){
        console.error(err);
        return res.status(500).json({error:"Monitor could not be created."});
    }
});
app.get('/api/getMonitorById/:id',async(req,res)=>{
    try{
        const monitor = await getMonitorById(req.params.id, req.user.id);
        if(!monitor){
            return res.status(404).json({error: "Monitor not found"});
        }
        res.json(monitor);
    }catch(err){
        console.error(err);
        res.status(500).json({error:"Failed to retrieve monitor."});
}
});
app.get('/api/getAllMonitors',async(req,res)=>{
try{
    const monitors = await getAllMonitors(req.user.id);
    res.json(monitors);
}catch(err){
    console.error(err);
    res.status(500).json({error: "Error occurred while retrieving monitors."});
}
});
app.put('/api/updateMonitorById/:id',validateMonitors,async(req,res)=>{
    const updates = {};
    for(let field of ['url', 'name', 'interval', 'statusCodes', 'method', 'headers', 'body']){
        if(req.body[field]!==undefined){
            updates[field] = req.body[field];
        }
    }
    if(Object.keys(updates).length === 0){
        return res.status(400).json({error:"No fields provided to update"});
    }
    try{
        const updated = await updateMonitorById(req.params.id, req.user.id, updates);
        if(!updated){
            return res.status(404).json({error: "Monitor not found."});
        }
        // Reschedule so the updated config (interval, url, etc.) takes effect immediately
        if(schedulerFns) schedulerFns.scheduleMonitor(updated);
        res.json(updated);
    }catch (err){
        console.error(err);
        res.status(500).json({error:"Failed to update monitor."});
    }
});
app.delete('/api/deleteMonitorById/:id',async(req,res)=>{
    try{
        const deleted = await deleteMonitorById(req.params.id, req.user.id);
        if(!deleted){
            return res.status(404).json({error: "Monitor not found or could not be deleted"});
        }
        // Stop the background interval so deleted monitors don't keep running
        if(schedulerFns) schedulerFns.unscheduleMonitor(Number(req.params.id));
        res.sendStatus(204);
    }
    catch(err){
        console.error(err);
        res.status(500).json({error: "Error occurred while deleting monitor."});
    }
});

const PORT = process.env.BACKEND_PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server started successfully and is running on port ${PORT}`);
});
schedulerFns = require('./worker');
