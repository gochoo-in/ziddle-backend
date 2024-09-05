import { Router } from 'express'
import auth from '../modules/auth/auth.routes.js'
import itinerary from '../modules/itinerary/itinerary.routes.js'
import destination from '../modules/destination/destination.routes.js'
import cities from '../modules/cities/cities.routes.js'
import activities from '../modules/activities/activities.routes.js'
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
        path: '/destination',
        route: destination
    },
    {
        path: '/cities',
        route: cities
    },
    {
        path: '/activities',
        route: activities
    }
    
]

/*This is how we can define Routes */

defaultRoutes.forEach((route) => {
    allRoutes.use(route.path, route.route);
});
export default allRoutes
