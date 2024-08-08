import cors from "cors";
import bodyParser from "body-parser";
import { StatusCodes } from "http-status-codes";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

 const middleware = [
  cors(),
  helmet(),
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true }),  
  rateLimit({
    max: 50,
    windowMs: 10000, // 10 seconds
    message: "You can't make any more requests at the moment. Try again later",
    headers: true, // Allow custom headers
    keyGenerator: (req) => req.ip, // Limit requests based on IP address
  }),
  (req, res, next) => {
    res.set('Cache-Control', 'no-store, max-age=0');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  },
  (error, req, res, next) => {
    if (error.type === 'time-out') {
      return res.status(StatusCodes.REQUEST_TIMEOUT).json(error);
    } 
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: error.message,
      });
    
  }
];

export default middleware