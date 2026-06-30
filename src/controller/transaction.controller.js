const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const mongoose = require("mongoose")

/**
 * - Create a new transaction
 * THE TRANSFER FLOW:
 *  1. Validate request body
 *  2. Validate idempotency key (prevent duplicate transactions)
 *  3. Check both account statuses are ACTIVE
 *  4. Derive sender balance and check sufficient funds
 *  5. Start MongoDB session + transaction (PENDING)
 *  6. Create DEBIT ledger entry (sender)
 *  7. Create CREDIT ledger entry (receiver)
 *  8. Mark transaction COMPLETED
 *  9. Commit MongoDB session
 *  10. Send email notification
 */
async function createTransaction(req, res) {
    try {
        // 1. Validate request
        const { fromAccount, toAccount, amount, idempotencyKey, description } = req.body

        if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
            return res.status(400).json({
                message: "fromAccount, toAccount, amount and idempotencyKey are required"
            })
        }

        if (fromAccount === toAccount) {
            return res.status(400).json({
                message: "fromAccount and toAccount cannot be the same"
            })
        }

        const [fromUserAccount, toUserAccount] = await Promise.all([
            accountModel.findById(fromAccount),
            accountModel.findById(toAccount)
        ])

        if (!fromUserAccount || !toUserAccount) {
            return res.status(400).json({
                message: "Invalid fromAccount or toAccount"
            })
        }

        // 2. Validate idempotency key
        const existingTransaction = await transactionModel.findOne({ idempotencyKey })

        if (existingTransaction) {
            if (existingTransaction.status === "COMPLETED") {
                return res.status(200).json({
                    message: "Transaction already processed",
                    transaction: existingTransaction
                })
            }
            if (existingTransaction.status === "PENDING") {
                return res.status(200).json({
                    message: "Transaction is still processing"
                })
            }
            if (existingTransaction.status === "FAILED") {
                return res.status(500).json({
                    message: "Transaction processing failed, please retry"
                })
            }
            if (existingTransaction.status === "REVERSED") {
                return res.status(500).json({
                    message: "Transaction was reversed, please retry"
                })
            }
        }

        // 3. Check account status
        if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
            return res.status(400).json({
                message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
            })
        }

        // 4. Derive sender balance from ledger
        const balance = await fromUserAccount.getBalance()

        if (balance < amount) {
            return res.status(400).json({
                message: `Insufficient balance. Current balance: ${balance}. Requested: ${amount}`
            })
        }

        let transaction;
        const session = await mongoose.startSession()

        try {
            session.startTransaction()

            // 5. Create transaction (PENDING)
            transaction = (await transactionModel.create([{
                fromAccount,
                toAccount,
                amount,
                idempotencyKey,
                description: description || "Transfer",
                status: "PENDING"
            }], { session }))[0]

            // 6. Create DEBIT ledger entry (sender)
            await ledgerModel.create([{
                account: fromAccount,
                amount,
                transaction_id: transaction._id,
                type: "DEBIT"
            }], { session })

            // 7. Create CREDIT ledger entry (receiver)
            await ledgerModel.create([{
                account: toAccount,
                amount,
                transaction_id: transaction._id,
                type: "CREDIT"
            }], { session })

            // 8. Mark transaction COMPLETED
            await transactionModel.findOneAndUpdate(
                { _id: transaction._id },
                { status: "COMPLETED" },
                { session, new: true }
            )

            // 9. Commit session
            await session.commitTransaction()
            session.endSession()

        } catch (error) {
            await session.abortTransaction()
            session.endSession()
            console.error("Transaction session error:", error)
            return res.status(500).json({
                message: "Transaction failed, please retry"
            })
        }

        // 10. Send email notification (non-blocking)
        emailService.sendTransactionEmail(
            req.user.email,
            req.user.username,
            amount,
            toAccount
        ).catch(err => console.error("Email error:", err.message))

        return res.status(201).json({
            message: "Transaction completed successfully",
            transaction
        })

    } catch (error) {
        console.error("createTransaction error:", error)
        return res.status(500).json({ message: "Internal server error" })
    }
}


/**
 * - Create initial funds from system user to a real account
 * - POST /api/transactions/system/initial-funds
 * - Protected: systemUser only
 */
async function createInitialFundsTransaction(req, res) {
    try {
        const { toAccount, amount, idempotencyKey } = req.body

        if (!toAccount || !amount || !idempotencyKey) {
            return res.status(400).json({
                message: "toAccount, amount and idempotencyKey are required"
            })
        }

        const [toUserAccount, fromUserAccount] = await Promise.all([
            accountModel.findById(toAccount),
            accountModel.findOne({ user: req.user._id })
        ])

        if (!toUserAccount) {
            return res.status(400).json({ message: "Invalid toAccount" })
        }

        if (!fromUserAccount) {
            return res.status(400).json({ message: "System user account not found" })
        }

        const session = await mongoose.startSession()

        let transaction;
        try {
            session.startTransaction()

            transaction = (await transactionModel.create([{
                fromAccount: fromUserAccount._id,
                toAccount,
                amount,
                idempotencyKey,
                description: "Initial funds",
                status: "PENDING"
            }], { session }))[0]

            await ledgerModel.create([{
                account: fromUserAccount._id,
                amount,
                transaction_id: transaction._id,
                type: "DEBIT"
            }], { session })

            await ledgerModel.create([{
                account: toAccount,
                amount,
                transaction_id: transaction._id,
                type: "CREDIT"
            }], { session })

            await transactionModel.findOneAndUpdate(
                { _id: transaction._id },
                { status: "COMPLETED" },
                { session }
            )

            await session.commitTransaction()
            session.endSession()

        } catch (error) {
            await session.abortTransaction()
            session.endSession()
            console.error("Initial funds session error:", error)
            return res.status(500).json({ message: "Initial funds transaction failed" })
        }

        return res.status(201).json({
            message: "Initial funds transaction completed successfully",
            transaction
        })

    } catch (error) {
        console.error("createInitialFundsTransaction error:", error)
        return res.status(500).json({ message: "Internal server error" })
    }
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction
}
