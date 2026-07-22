"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTAuth = void 0;
const jwt = __importStar(require("jsonwebtoken"));
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
            if (await User.findOne({ id: decoded.userId })) {
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
