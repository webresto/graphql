import * as jwt from 'jsonwebtoken'

// GEN SECRET
type AuthData = {
  userId: string
  deviceId: string
  sessionId: string
}

type JWTData = {
  data: AuthData
  iat: number
  exp: number
}


export class JWTAuth {
  public static sign(authData: AuthData): string {
    return jwt.sign({
      data: authData
    }, process.env.JWT_SECRET, { expiresIn: parseInt(process.env.JWT_TOKEN_EXPIRES_IN) || 15 * 24 * 60 * 60 });

  }

  public static async verify(token: string): Promise<AuthData>{

    if (!token) {
      throw `Verify JWT token is: ${token}`
    }

    let decoded: AuthData;
    try {
       let jwtData = (jwt.verify(token, process.env.JWT_SECRET)) as JWTData
        decoded = jwtData.data
    } catch(err) {
      sails.log.error(`JWT verify error: `, err)
      throw err
    }

    if(decoded.userId && decoded.deviceId && decoded.sessionId) {
      if (await User.findOne({id: decoded.userId})) {

        let device = await UserDevice.findOne({where: {id: decoded.deviceId, user: decoded.userId, sessionId: decoded.sessionId}});
        if(!device || device.isLoggedIn !== true) {
          throw `Logged in device not found`
        } else {
          return decoded;
        }
      } else {
        throw `no user with id ${decoded.userId}`
      }
    } else {
      throw `JWT decoded user or device not found`
    }
  }
}
