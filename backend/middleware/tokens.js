import jwt from 'jsonwebtoken';
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET_KEY;

export const generateTokens = (userId) => {
  let accessToken;
  try {
    accessToken = jwt.sign(
      { 
        userId,
        type: "access",
        iat: Math.floor(Date.now() / 1000)
      }, 
      JWT_SECRET, 
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' }
    );
  } catch (err) {
    console.error('Access token sign error:', err);
    throw err;
  }

  let refreshToken;
  try {
    refreshToken = jwt.sign(
      { 
        userId,
        type: "refresh",
        iat: Math.floor(Date.now() / 1000)
      }, 
      JWT_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
    );
  } catch (err) {
    console.error('Refresh token sign error:', err);
    throw err;
  }

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch(error) {
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch(error) {
    return null;
  }
};

export const authenticateToken = () => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const cookieAccess = req.cookies?.accessToken;
    const cookieRefresh = req.cookies?.refreshToken;

    let token = null;
    let decoded = null;

    // Prefer Authorization header
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      decoded = verifyAccessToken(token);
      if (!decoded) {
        console.error('Invalid access token provided in Authorization header');
        return res.status(401).json({ error: 'Invalid access token', code: 'INVALID_ACCESS_TOKEN' });
      }
    } else if (cookieAccess) {
      token = cookieAccess;
      decoded = verifyAccessToken(token);
      if (!decoded) {
        // invalid access cookie, fallthrough to try refresh
        decoded = null;
      }
    }

    // If we didn't get a valid access token, try refresh token
    if (!decoded && cookieRefresh) {
      const refreshDecoded = verifyRefreshToken(cookieRefresh);
      if (!refreshDecoded) {
        console.error('Invalid refresh token cookie');
        return res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' });
      }

      // generate a new access token
      const { accessToken: newAccess } = generateTokens(refreshDecoded.userId);

      // set access token cookie
      res.cookie('accessToken', newAccess, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000
      });

      decoded = verifyAccessToken(newAccess);
      token = newAccess;
    }

    if (!decoded) {
      console.error('Authorization failed. authHeader:', !!authHeader, 'cookieAccess:', !!cookieAccess, 'cookieRefresh:', !!cookieRefresh);
      return res.status(401).json({ error: 'Authorization required', code: 'MISSING_AUTH' });
    }

    req.user = { ...decoded, id: decoded.userId };
    req.userId = decoded.userId;

    next();
  };
};

export const generateAccessToken = (userId) => {
  accessToken = jwt.sign(
    {
      userId,
      type: "access",
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
  );

  return accessToken;
}