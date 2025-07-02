const jwt = require('jsonwebtoken');
module.exports = (req,res,next)=>{
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer (.+)$/);
    if(!match)
    {
        return res.status(401).json({error:"Missing authorization token"});
    }
    const token = match[1];
    try{
        const payload = jwt.verify(token,process.env.JWT_SECRET);
        req.user = {id: payload.userId};
        next();
    }catch(err)
    {
        console.error(err);
        return res.status(401).json({error: "Invalid token."});
    }  
};