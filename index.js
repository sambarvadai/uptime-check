require("dotenv").config();
const express = require("express");
const {
    createNewMonitor,
    getMonitorById,
    updateMonitorById,
    deleteMonitorById,
    getAllMonitors,} = require('./db')
const auth = require('./middleware/auth');
const app = express();
app.use(express.json());
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
        res.status(500).json({error:"Monitor could not be created. Please check console for details."});
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
        res.status(400).json({error:"No fields provided to update"});
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