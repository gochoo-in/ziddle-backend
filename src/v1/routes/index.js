import { Router } from 'express'
import auth from '../modules/auth/auth.routes.js'
import itinerary from '../modules/itinerary/itinerary.routes.js'
import destination from '../modules/destination/destination.routes.js'
import cities from '../modules/cities/cities.routes.js'
import activities from '../modules/activities/activities.routes.js'
import contactUs from '../modules/contactUs/contactUs.routes.js'
import profile from '../modules/profiles/profiles.routes.js'
import cityHotels from '../modules/hotels/hotels.routes.js'
import adminUser from '../modules/admin/user.routes.js'
import callbackRequest from '../modules/callbackRequest/callbackRequest.routes.js'
import categorySection from '../modules/categorySection/category.routes.js'
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
    },
    {
        path: '/cities',
        route: cityHotels
    },
    {
        path: '/contact-us',
        route: contactUs
    },
    {
        path: '/profile',
        route: profile
    },
    {
        path: '/admin',
        route: adminUser
    },
    {
        path: '/user',
        route: callbackRequest
    },
    {
        path: '/section',
        route: categorySection
    }

]

/*This is how we can define Routes */

defaultRoutes.forEach((route) => {
    allRoutes.use(route.path, route.route);
});
export default allRoutes
