import { Router } from "express";
import { signup,login } from "./auth.controller.js";

const routers  = Router();
routers.post('/signup',signup);
routers.post('/login',login)

export default routers