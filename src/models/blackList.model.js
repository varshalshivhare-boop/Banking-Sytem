const mongoose = require('mongoose');

const blackListSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 259200 // 3 days in seconds (matches the 3d token expiry)
    }
});

module.exports = mongoose.model('BlackList', blackListSchema);
