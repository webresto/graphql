"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTAuth = void 0;
const jwt = require("jsonwebtoken");
class JWTAuth {
    static sign(authData) {
        return jwt.sign({
            data: authData
        }, process.env.JWT_SECRET, { expiresIn: parseInt(process.env.JWT_TOKEN_EXPIRES_IN) || 15 * 24 * 60 * 60 });
    }
    static async verify(token) {
        if (!token) {
            throw `Verify JWT token is: ${token}`;
        }
        let decoded;
        try {
            let jwtData = (jwt.verify(token, process.env.JWT_SECRET));
            decoded = jwtData.data;
        }
        catch (err) {
            sails.log.error(`JWT verify error: `, err);
            throw err;
        }
        if (decoded.userId && decoded.deviceId && decoded.sessionId) {
            // A soft-deleted account is no account: its devices are logged out by User.delete, but a
            // token minted before that must not outlive the deletion either (review2 §3).
            const user = await User.findOne({ id: decoded.userId });
            if (user && !user.isDeleted) {
                let device = await UserDevice.findOne({ where: { id: decoded.deviceId, user: decoded.userId, sessionId: decoded.sessionId } });
                if (!device || device.isLoggedIn !== true) {
                    throw `Logged in device not found`;
                }
                else {
                    return decoded;
                }
            }
            else {
                throw `no user with id ${decoded.userId}`;
            }
        }
        else {
            throw `JWT decoded user or device not found`;
        }
    }
}
exports.JWTAuth = JWTAuth;
