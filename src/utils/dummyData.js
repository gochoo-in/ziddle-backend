export function addGeneralDummyData(itinerary) {
  itinerary.itinerary.forEach((segment, index) => {
      const nextSegment = itinerary.itinerary[index + 1];

      // Add transport details if transport exists
      if (segment.transport) {
          const mode = segment.transport.mode;
          // Fetch transport details based on the mode of transport
          segment.transport.modeDetails = getDummyTransportDetails(mode, segment, nextSegment);
      } else {
          // Handle missing transport information
          segment.transport = {
              modeDetails: { message: 'Transport details are not available' }
          };
      }

      // Update hotel booking details based on arrival and departure
      const checkInDate = segment.days[0].date;
      const checkOutDate = nextSegment ? nextSegment.days[0].date : segment.days[segment.days.length - 1].date; // Use next city's first day as check-out date

      // Add hotel booking details dynamically
      segment.hotelDetails = [
          {
              hotelName: "Hotel Sonnenberg",
              checkInDate: `${checkInDate}T14:00:00`,  // Assuming check-in time is 2 PM
              checkOutDate: `${checkOutDate}T12:00:00`, // Assuming check-out time is 12 PM
              location: "Near Natur-Museum",
              rooms: [
                  {
                      roomName: "Room 1",
                      type: "Single room",
                      area: "86 sqft",
                      accommodates: "1 adult",
                      bedType: "1 Queen bed",
                      nonRefundable: true,
                      amenities: [
                          "Wifi",
                          "Breakfast",
                          "Air conditioner",
                          "Elevator",
                          "Pets allowed"
                      ],
                      rating: 3,
                      starRating: "3 star",
                      roomCategory: "Luxe"
                  }
              ]
          }
      ];
  });

  return itinerary;
}

function getDummyTransportDetails(mode, segment, nextSegment) {
  if (!mode) {
      // Handle case when mode is undefined
      return {
          message: 'Transport mode is not specified'
      };
  }

  // Check nextSegment for arrival dates and use segment for departure dates
  const departureDate = segment.days[0].date;
  const arrivalDate = departureDate;  
  // Generate transport details based on the mode
  switch (mode) {
      case 'Ferry':
          return {
              ferryNumber: `FR${Math.floor(Math.random() * 1000)}`,
              departure: `${segment.currentCity} Pier`,
              arrival: `${nextSegment.currentCity} Island Pier`,
              departureTime: `${departureDate}T08:00:00`,
              arrivalTime: `${arrivalDate}T10:30:00`,
              duration: '2 hours 30 minutes',
              refundable: true
          };
      case 'Car':
          return {
              carNumber: `CAR${Math.floor(Math.random() * 1000)}`,
              pickupPoint: `${segment.currentCity} Hotel`,
              dropOffPoint: `${nextSegment.currentCity} Hotel`,
              pickupTime: `${departureDate}T08:00:00`,
              dropOffTime: `${arrivalDate}T10:30:00`,
              duration: '2 hours 30 minutes',
              refundable: true
          };
      case 'Train':
          return {
              trainNumber: `TR${Math.floor(Math.random() * 1000)}`,
              departure: `${segment.currentCity} Station`,
              arrival: `${nextSegment.currentCity} Station`,
              departureTime: `${departureDate}T10:00:00`,
              arrivalTime: `${arrivalDate}T18:00:00`,
              duration: '8 hours',
              refundable: true
          };
      case 'Flight':
          return segment.transport.modeDetails || { message: 'No transport details available for mode: Flight' };
      default:
          return {
              message: `No transport details available for mode: ${mode}`
          };
  }
}
