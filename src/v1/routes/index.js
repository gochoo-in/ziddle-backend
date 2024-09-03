import { Router } from 'express'
import auth from '../modules/auth/auth.routes.js'

const allRoutes = Router()

const defaultRoutes = [

    {
        path: '/auth',
        route: auth,
    }
]


/*This is how we can define Routes */

defaultRoutes.forEach((route) => {
    allRoutes.use(route.path, route.route);
});
export default allRoutes