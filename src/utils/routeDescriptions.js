export const routeDescriptions = {
  '/': {
    GET: 'Base API route'
  },
  '/health': {
    GET: 'API health check'
  },
  '/health/mongo': {
    GET: 'MongoDB health check'
  },
  '/endpoints': {
    GET: 'List all API endpoints'
  },
  '/api/v1/auth/signup': {
    POST: 'Register a new user'
  },
  '/api/v1/auth/signin': {
    POST: 'Authenticate a user'
  },
  '/api/v1/auth/logout': {
    POST: 'Logout a user'
  },
  '/api/v1/itinerary/createItinerary': {
    POST: 'Create a new itinerary'
  },
  '/api/v1/destination': {
    GET: 'Get destinations',
    POST: 'Add a destination'
  },
  '/api/v1/destination/:destinationId': {
    GET: 'Get a destination',
    PATCH: 'Update a destination',
    DELETE: 'Delete a destination'
  },
  '/api/v1/destination/:destinationId/activities': {
    GET: 'Get activities for a destination'
  },
  '/api/v1/destination/:destinationId/cities': {
    GET: 'Get cities for a destination'
  },
  '/api/v1/cities': {
    GET: 'List cities',
    POST: 'Add a city'
  },
  '/api/v1/cities/:cityName/activities': {
    GET: 'Get activities for a city'
  },
  '/api/v1/cities/:cityId': {
    GET: 'Get a city',
    PATCH: 'Update a city',
    DELETE: 'Delete a city'
  },

  '/api/v1/cities/activities': {
    GET: 'Get activities for multiple cities'
  },
'/api/v1/activities/:activityId': {
  GET: 'Get an activity',
    PATCH: 'Update an activity',
      DELETE: 'Delete an activity'
},
'/api/v1/activities': {
  POST: 'Add a new activity'
},
'/api/v1/cities/:cityId/hotels': {
  GET: 'Get top hotels in a city'
},
'/api/v1/contact-us': {
  POST: 'Submit a contact request'
},
'/api/v1/profile/:userId': {
  POST: 'Add profile details for a user'
},
'/api/v1/profile/:profileId': {
  GET: 'Get profile details',
    PATCH: 'Update profile details',
      DELETE: 'Delete a profile'
},
'/api/v1/user/:userId/request-callback': {
  POST: 'Request a callback for a user'
},
'/api/v1/section': {
  GET: 'List sections',
    POST: 'Add a section'
},
'/api/v1/section/:sectionId': {
  GET: 'Get a section',
    PATCH: 'Update a section',
      DELETE: 'Delete a section'
},
'/api/v1/admin/signup': {
  POST: 'Register a new admin'
},
'/api/v1/admin/signin': {
  POST: 'Authenticate an admin'
},
'/api/v1/admin/logout': {
  POST: 'Logout an admin'
},
'/api/v1/admin/:employeeId': {
  DELETE: 'Delete an employee'
},
'/api/v1/admin/employees': {
  GET: 'Get all employees'
},
'/api/v1/policy': {
  GET: 'List policies',
    POST: 'Add a new policy'
},
'/api/v1/policy/:id': {
  PATCH: 'Update a policy',
    DELETE: 'Delete a policy'
},
'/api/v1/cities/:departureCityId/:arrivalCityId/flights': {
  GET: 'Get flights between cities'
},
'/api/v1/admin/:employeeId/package': {
  POST: 'Create a new package for admin'
},
'/api/v1/admin/packages': {
  GET: 'Get filtered packages'
},
'/api/v1/admin/:employeeId/package/:packageId': {
  PATCH: 'Update a package by ID',
    DELETE: 'Delete a package by ID'
}
  };
