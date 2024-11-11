import jwt from "jsonwebtoken";
import Config from "../config/index.js";

const { jwtSecret } = Config;

// Function to create a JWT
export const createJWT = (userId) => {
  try {
    const payload = { userId };

    // Define the expiration time for the JWT (e.g., 30 days)
    const expiresIn = 30 * 24 * 60 * 60; // 30 days in seconds

    // Create a JWT using the payload and a secret key from environment variables
    return jwt.sign(payload, jwtSecret, { expiresIn });
  } catch (error) {
    // Handle any errors that occur during JWT creation
    console.error(`JWT Creation Error: ${error.message}`);
    return false; // Indicate that JWT creation failed
  }
};

// Middleware function for verifying JWT tokens
export const verifyToken = (req, res, next) => {
  try {
    let token = req.headers.authorization || req.query.token || req.cookies.token || req.cookies.Authorization;

    // Check if the token is present
    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Unauthorized!! No token provided.",
      })
    }

    // If the token is in the 'Bearer <token>' format, split and extract the actual token
    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    // Verify the token's authenticity using the secret key
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        // Token verification failed; send an unauthorized response
        return res.status(StatusCodes.UNAUTHORIZED).json({
          message: "Unauthorized: Invalid token",
        })
      }

      // If the token is valid, store its payload in the 'req.user' object
      req.user = decoded;

      // Move on to the next middleware or route handler
      next();
    });
  } catch (error) {
    // Handle any errors that occur during token verification
    console.error(`verifyToken Error: ${error.message}`);
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: "Unauthorized: Invalid token",
    })
  }
};
