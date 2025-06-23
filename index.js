require("dotenv").config();
const express = require("express");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const {
    createNewMonitor,
    getMonitorById,
    updateMonitorById,
    deleteMonitorById,
    getAllMonitors,
    createUser,
    getUserByUsername} = require('./db')
const auth = require('./middleware/auth');
const app = express();
app.use(express.json());
app.post('/api/register',async(req,res)=>{
const {username,password} = req.body;
if(!username || !password){
    return res.status(400).json({error: "Missing username or password. Please check your input and try again"});
}
try{
    const existing = await getUserByUsername(username);
    if(existing){
        return res.status(400).json({error: "Username already exists. Please try with a different username."});
    }
    const user = await createUser({username,password});
    res.status(201).json({id: user.id, username: user.username});
}
catch(err){
    console.error(err);
    return res.status(500).json({error:"Error occurred while registration. Please check the console for more details."});
}
});
app.post('/api/login',async(req,res)=>{
const{username, password} = req.body;
if(!username || !password){
    return res.status(400).json({error:"Missing username or password. Please provide the inputs and try again."});
}
try{
    const user = await getUserByUsername(username);
    if(!user || !(await bcrypt.compare(password,user.password_hash))){
        return res.status(401).json({error: "Invalid username or password. Please check your credentials and try again."});
    }
    const token = jwt.sign({userId: user.id},
        process.env.JWT_SECRET,
        {expiresIn: '2h'}
    );
    res.json({token});
} catch(error){
console.error(error);
 return res.status(500).json({error: "Couldn't complete the login process. Please check the console for more details."});
}
});
app.use(auth);
//Routes and their info
app.post('/api/monitors',async(req,res)=>{
    const{url, name,interval, statusCodes} = req.body;
    if(!url || !interval){
        return res.status(400).json({error: "URL and Interval are required inputs"});
    }
    try{
        const monitor = await createNewMonitor({
            userId : req.user.id,
            url,
            interval,
            name,
            statusCodes
        });
        res.status(201).json(monitor);
    }catch(err){
        console.error(err);
        return res.status(500).json({error:"Monitor could not be created. Please check console for details."});
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
        res.status(500).json({error:"Error occurred while retrieving monitor. Please check console for more details."});
}
});
app.get('/api/getAllMonitors',async(req,res)=>{
try{
    const monitors = await getAllMonitors(req.user.id);
    res.json(monitors);
}catch(err){
    console.error(err);
    res.status(500).json({error: "Error occurred while retrieving all monitor details. Please check consoole for details."});   
}
});
app.put('/api/updateMonitorById/:id',async(req,res)=>{
    const updates = {};
    for(let field of ['url', 'name', 'interval', 'statusCodes']){
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

            return res.status(404).json({error: "Failed to update."});
    }
    res.json(updated);
}catch (err){
    console.error(err);
    res.status(500).json({error:"Failed to update. Please check console for details"});
}
});
app.delete('/api/deleteMonitorById/:id',async(req,res)=>{
    try{
        const deleted = await deleteMonitorById(req.params.id, req.user.id);
    if(!deleted){
       return res.status(404).json({error: "Monitor not found or could not be deleted"});
    }
    res.sendStatus(204);
     }
    catch(err){
        console.error(err);
        res.status(500).json({error: "Error occurred while deleting monitor. Please check console for details."});
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server started successfully and is running on port ${PORT}`);
});