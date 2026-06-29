const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const emailService = require("../services/email.service")
const tokenBlackListModel = require("../models/blackList.model")

/**
* - user register controller
* - POST /api/auth/register
*/
async function userRegisterController(req, res) {
    try {
        const { email, password, username } = req.body

        if (!email || !password || !username) {
            return res.status(400).json({
                message: "Email, password, and username are required."
            });
        }

        const isExists = await userModel.findOne({ email })

        if (isExists) {
            return res.status(422).json({
                message: "User already exists with email.",
                status: "failed"
            })
        }

        const user = await userModel.create({
            email, password, username
        })

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

        res.cookie("token", token)

        res.status(201).json({
            user: {
                _id: user._id,
                email: user.email,
                username: user.username
            },
            token
        })

        // Send registration email asynchronously without blocking the client response
        emailService.sendRegistrationEmail(user.email, user.username).catch(err => {
            console.error("Email service error:", err.message);
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(400).json({
            message: error.message
        });
    }
}

/**
 * - User Login Controller
 * - POST /api/auth/login
 */
async function userLoginController(req, res) {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await userModel.findOne({ email }).select("+password")

        if (!user) {
            return res.status(401).json({
                message: "Email or password is INVALID"
            })
        }

        const isValidPassword = await user.comparePassword(password)

        if (!isValidPassword) {
            return res.status(401).json({
                message: "Email or password is INVALID"
            })
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

        res.cookie("token", token)

        res.status(200).json({
            user: {
                _id: user._id,
                email: user.email,
                username: user.username
            },
            token
        })
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
}

/**
 * - User Logout Controller
 * - POST /api/auth/logout
 */
async function userLogoutController(req, res) {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]

        if (!token) {
            return res.status(200).json({
                message: "User logged out successfully"
            })
        }

        await tokenBlackListModel.create({
            token: token
        })

        res.clearCookie("token")

        res.status(200).json({
            message: "User logged out successfully"
        })
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
}

module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController
}