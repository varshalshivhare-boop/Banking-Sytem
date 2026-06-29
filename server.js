require('dotenv').config();
const app=require("./src/app")
const connectDB = require("./src/db/db")

// Connect Database
connectDB();

const PORT = process.env.PORT || 4525;

app.listen(PORT,()=>{
    console.log(`server is running on ${PORT} port`)
})