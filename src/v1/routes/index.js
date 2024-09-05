import { Router } from 'express'
import auth from '../modules/auth/auth.routes.js'
import itinerary from '../modules/itinerary/itinerary.routes.js'
import customize from '../modules/customize/destination/destination.routes.js'
import cities from '../modules/customize/destination/cities/cities.routes.js'
import activities from '../modules/customize/destination/cities/activities/activities.routes.js'
const allRoutes = Router()

const defaultRoutes = [

    {
        path: '/auth',
        route: auth,
    },
    {
        path: '/itinerary',
        route: itinerary
    },
    {
        path: '/customize',
        route: customize
    },
    {
        path: '/customize/destination',
        route: cities
    },
    {
        path: '/customize/destination/cities',
        route: activities
    }
]


/*This is how we can define Routes */

defaultRoutes.forEach((route) => {
    allRoutes.use(route.path, route.route);
});
export default allRoutes