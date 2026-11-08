/**
 * Property facts used in guest copy and reply drafts. Values marked ASSUMPTION
 * are not in the client brief and are listed in the TDD for the GM to confirm.
 */
export const RESORT = {
  name: "Kaapi Hills Estate",
  place: "Chikkamagaluru, Karnataka",
  phone: "+91 80000 00000",
  email: "stay@kaapihills.example",
  checkInTime: "2 pm",
  checkOutTime: "11 am",
  keys: 76,
  venues: {
    lawnCapacity: 400, // ASSUMPTION
    conferenceHallCapacity: 80, // ASSUMPTION
    boardroomCapacity: 16, // ASSUMPTION
  },
  maxGuestsInHouse: 170, // ASSUMPTION: 76 keys at ~2.2 guests per key
  enquiryRetentionDays: 180, // ASSUMPTION: enquiry data purged after 6 months unless it becomes a booking
} as const;
