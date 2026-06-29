const mongoose = require("mongoose")


function connectToDB() {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log("Successfully connected to MongoDB");
        })
        .catch((err) => {
            
            console.log("Error connecting to MongoDB:", err);
        process.exit(1)
        
        });
}

module.exports=connectToDB