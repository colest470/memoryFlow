import jwt from 'jsonwebtoken';
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET_KEY;

export const generateTokens = (userId) => {
  console.log('Token expiries:', {
    ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || '15m',
    REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d'
  });

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
    console.log("Decoded access token:", decoded);
    return decoded;
  } catch(error) {
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Decoded refresh token:", decoded);
    return decoded;
  } catch(error) {
    return null;
  }
};

export const authenticateToken = () => {
  return async (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Authorization header missing',
        code: 'MISSING_AUTH_HEADER'
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ 
        error: 'Malformed authorization header', 
        code: 'MALFORMED_HEADER' 
      });
    }

    const token = parts[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
    }

    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({ 
        error: 'Access token expired or invalid',
        code: 'EXPIRED_ACCESS_TOKEN',
        action: 'ACCESS_TOKEN'
      });
    }

    if (decoded.type !== 'access') {
      return res.status(401).json({ 
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    const decoded2 = verifyRefreshToken(req.cookies.refreshToken);

    if (!decoded2) {
      return res.status(401).json({ 
        error: 'Access token expired or invalid',
        code: 'EXPIRED_ACCESS_TOKEN',
        action: 'REFRESH_TOKEN'
      });
    }

    console.log("Decoded 2", decoded2);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ 
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // let accessToken = generateAccessToken();

    req.user = { ...decoded, id: decoded.userId } || { ...decoded2, id: decoded2.userId };
    req.userId = decoded.userId || decoded2.userId;

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