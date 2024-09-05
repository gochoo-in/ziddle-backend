import City from '../models/city.js';

// Dummy hotel data
const hotelData = {
    totalResults: 130,
    results: [
      {
        hotelName: "Hotel Marina",
        isLuxe: true,
        starRating: 4,
        mapView: true,
        roomDetail: {
          type: "Single room",
          area: "86 sqft",
          beds: [
            {
              type: "Twin",
              count: 1
            }
          ],
          nonRefundable: true,
          wifi: true,
          breakfastIncluded: true,
          facilities: [
            "Elevator",
            "Pet allowed",
            "8 more facilities available"
          ]
        },
        price: {
          amount: 7515.15,
          currency: "INR"
        },
        viewDealUrl: "/hotels/12345/view-deal"
      },
      {
        hotelName: "Ocean Breeze Resort",
        isLuxe: false,
        starRating: 3,
        mapView: false,
        roomDetail: {
          type: "Double room",
          area: "120 sqft",
          beds: [
            {
              type: "Queen",
              count: 1
            }
          ],
          nonRefundable: false,
          wifi: true,
          breakfastIncluded: false,
          facilities: [
            "Free Parking",
            "Swimming Pool",
            "5 more facilities available"
          ]
        },
        price: {
          amount: 5400.00,
          currency: "INR"
        },
        viewDealUrl: "/hotels/67890/view-deal"
      },
      {
        hotelName: "Mountain View Lodge",
        isLuxe: true,
        starRating: 5,
        mapView: true,
        roomDetail: {
          type: "Suite",
          area: "200 sqft",
          beds: [
            {
              type: "King",
              count: 1
            }
          ],
          nonRefundable: false,
          wifi: true,
          breakfastIncluded: true,
          facilities: [
            "Spa",
            "Fitness Center",
            "10 more facilities available"
          ]
        },
        price: {
          amount: 10200.50,
          currency: "INR"
        },
        viewDealUrl: "/hotels/11223/view-deal"
      },
      {
        hotelName: "City Central Hotel",
        isLuxe: false,
        starRating: 3,
        mapView: false,
        roomDetail: {
          type: "Single room",
          area: "80 sqft",
          beds: [
            {
              type: "Single",
              count: 1
            }
          ],
          nonRefundable: true,
          wifi: false,
          breakfastIncluded: false,
          facilities: [
            "Elevator",
            "Airport Shuttle",
            "3 more facilities available"
          ]
        },
        price: {
          amount: 3800.75,
          currency: "INR"
        },
        viewDealUrl: "/hotels/33445/view-deal"
      },
      {
        hotelName: "Seaside Paradise Inn",
        isLuxe: true,
        starRating: 4,
        mapView: true,
        roomDetail: {
          type: "Deluxe room",
          area: "150 sqft",
          beds: [
            {
              type: "King",
              count: 1
            }
          ],
          nonRefundable: false,
          wifi: true,
          breakfastIncluded: true,
          facilities: [
            "Private Beach",
            "Water Sports",
            "7 more facilities available"
          ]
        },
        price: {
          amount: 8500.25,
          currency: "INR"
        },
        viewDealUrl: "/hotels/55667/view-deal"
      },
      {
        hotelName: "Sunset Boulevard Hotel",
        isLuxe: false,
        starRating: 2,
        mapView: false,
        roomDetail: {
          type: "Double room",
          area: "100 sqft",
          beds: [
            {
              type: "Double",
              count: 2
            }
          ],
          nonRefundable: true,
          wifi: false,
          breakfastIncluded: false,
          facilities: [
            "Free Parking",
            "Pet Friendly",
            "2 more facilities available"
          ]
        },
        price: {
          amount: 3100.00,
          currency: "INR"
        },
        viewDealUrl: "/hotels/77890/view-deal"
      }
    ]
  };
  

// Service to fetch hotels by cityId
export const fetchHotels = async (cityId, startDate, endDate, adults, rooms) => {
  try {
    // Fetch city from DB to validate cityId
    const city = await City.findById(cityId);
    if (!city) {
      throw new Error('City not found');
    }

    // Return dummy hotel data for now
    const hotels = hotelData;

    if (!hotels) {
      throw new Error('No hotels found for this city');
    }

    return {
      city: city.name,
      totalResults: hotels.totalResults,
      results: hotels.results
    };
  } catch (error) {
    // Pass the error to be handled by the controller
    throw new Error(error.message || 'Error fetching hotels');
  }
};
