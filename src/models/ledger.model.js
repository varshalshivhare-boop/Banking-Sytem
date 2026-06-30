const mongoose = require("mongoose")

const ledgerSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "account is required"],
        immutable: true,
    },
    transaction_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "transaction",
        required: [true, "transaction id is required"],
        immutable: true,
    },
    amount: {
        type: Number,
        required: [true, "amount is required"],
        immutable: true,
    },
    type: {
        type: String,
        enum: ["DEBIT", "CREDIT"],
        required: [true, "type is required"],
        immutable: true,
    }
}, {
    timestamps: true
})

// Prevent any modification or deletion of ledger entries
function preventLedgerModification() {
    throw new Error("Ledger entries are immutable and cannot be modified or deleted");
}

ledgerSchema.pre(
    ["updateOne", "updateMany", "findOneAndUpdate", "deleteOne", "deleteMany", "findOneAndDelete"],
    preventLedgerModification
)

const ledgerModel = mongoose.model("ledger", ledgerSchema)
module.exports = ledgerModel