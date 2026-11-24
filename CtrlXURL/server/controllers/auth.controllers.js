const userModel = require('../models/user.models');
const bcrypt = require('bcrypt');
const setCookies = require('../utils/setCookies');
const generateTokens = require('../utils/generateToken');

const userRegister = async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
        return res.status(400).json({
            message: "User already exists"
        });
    }
    const hashPass = await bcrypt.hash(password, 10);
    let user;
    try {
        user = await userModel.create({
            username,
            email,
            password: hashPass
        });
        const { accessToken, refreshToken } = generateTokens(user);
        user.refreshToken = refreshToken;
        await user.save();
        setCookies(res, accessToken, refreshToken);

        return res.status(201).json({
            message: "Account created successfully"
        });
    } catch (err) {
        if (user && user._id) {
            await userModel.findByIdAndDelete(user._id);
        }
        return res.status(500).json({
            message: err.message
        });
    }
};

const userLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password is required"
            });
        }
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({
                message: "User is not found"
            });
        }
        const isPass = await bcrypt.compare(
            password,
            user.password
        );
        if (!isPass) {
            return res.status(400).json({
                message: "Password is incorrect"
            });
        }
        const { accessToken, refreshToken } = generateTokens(user);
        user.refreshToken = refreshToken;
        await user.save();
        setCookies(res, accessToken, refreshToken);

        return res.status(200).json({
            message: "Login successful"
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
}

const userLogout = async (req, res) => {
    try {
        const user = await userModel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            })
        }
        user.refreshToken = null;
        await user.save();
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");

        return res.status(200).json({
            message: "User Logout successfully"
        })

    } catch (err) {
        return res.status(500).json({
            message: err.message
        })
    }
}

const getProfile = async (req, res) => {
    return res.status(200).json({
        user: req.user
    });
};

module.exports = {
    userRegister,
    userLogin,
    userLogout,
    getProfile
}
