const mongoose = require("mongoose")

const transactionSchema = new mongoose.Schema({

    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "from account is required"]
    },
    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "to account is required"]
    },
    status: {
        type: String,
        enum: ["SUCCESS", "PENDING", "FAILED", "COMPLETED", "REVERSED"],
        default: "PENDING",
    },
    amount: {
        type: Number,
        required: [true, "amount is required"],
        min: [1, "amount must be greater than 0"]
    },
    description: {
        type: String,
        default: "Transfer"
    },
    idempotencyKey: {
        type: String,
        required: [true, "idempotency key is required"],
        index: true,
        unique: true,
    }

}, {
    timestamps: true
})


const transactionModel = mongoose.model("transaction", transactionSchema)

module.exports = transactionModel