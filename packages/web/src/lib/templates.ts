import type { Schedule } from "./api";

export type Template = {
  id: string;
  category: string;
  title: string;
  description: string;
  businessName: string;
  serviceName: string;
  location: string;
  languageHint: string;
  voice: string;
  brandColor: string;
  slots: string;
  greeting: string;
  schedule: Schedule;
};

const sixDayClinic: Schedule = {
  timezone: "Asia/Kolkata",
  slotMinutes: 15,
  leadTimeMinutes: 60,
  horizonDays: 14,
  weeklyHours: [
    { weekday: 0, ranges: [] },
    { weekday: 1, ranges: [{ open: "10:00", close: "13:00" }, { open: "17:00", close: "20:00" }] },
    { weekday: 2, ranges: [{ open: "10:00", close: "13:00" }, { open: "17:00", close: "20:00" }] },
    { weekday: 3, ranges: [{ open: "10:00", close: "13:00" }, { open: "17:00", close: "20:00" }] },
    { weekday: 4, ranges: [{ open: "10:00", close: "13:00" }, { open: "17:00", close: "20:00" }] },
    { weekday: 5, ranges: [{ open: "10:00", close: "13:00" }, { open: "17:00", close: "20:00" }] },
    { weekday: 6, ranges: [{ open: "10:00", close: "13:00" }] },
  ],
};

const salonAllWeek: Schedule = {
  timezone: "Asia/Kolkata",
  slotMinutes: 60,
  leadTimeMinutes: 120,
  horizonDays: 14,
  weeklyHours: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    ranges: weekday === 1 ? [] : [{ open: "10:00", close: "20:00" }],
  })),
};

const retailWeekend: Schedule = {
  timezone: "Asia/Kolkata",
  slotMinutes: 60,
  leadTimeMinutes: 240,
  horizonDays: 14,
  weeklyHours: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    ranges: weekday === 0 ? [{ open: "11:00", close: "20:00" }] : [{ open: "11:00", close: "20:00" }],
  })),
};

const realEstateAppointments: Schedule = {
  timezone: "Asia/Kolkata",
  slotMinutes: 45,
  leadTimeMinutes: 240,
  horizonDays: 21,
  weeklyHours: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    ranges: weekday === 1 ? [] : [{ open: "10:30", close: "18:30" }],
  })),
};

const restaurantEvenings: Schedule = {
  timezone: "Asia/Kolkata",
  slotMinutes: 30,
  leadTimeMinutes: 60,
  horizonDays: 14,
  weeklyHours: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    ranges: weekday >= 5 || weekday === 0
      ? [{ open: "12:00", close: "15:30" }, { open: "19:00", close: "23:00" }]
      : [{ open: "19:00", close: "23:00" }],
  })),
};

export const templates: Template[] = [
  {
    id: "clinic-appointment",
    category: "Healthcare",
    title: "Clinic Appointment",
    description: "Collect patient name, mobile number, preferred doctor timing, and confirm a clinic visit.",
    businessName: "Shree Care Clinic",
    serviceName: "Doctor appointment",
    location: "Ahmedabad",
    languageHint: "Hindi, English, Gujarati, Hinglish",
    voice: "female",
    brandColor: "#0d6b57",
    slots: "Tomorrow 10:30 AM\nTomorrow 5:00 PM\nSaturday 11:45 AM",
    greeting: "Namaste! Shree Care Clinic mein aapka swagat hai. Doctor appointment book karni hai?",
    schedule: sixDayClinic,
  },
  {
    id: "salon-service",
    category: "Beauty",
    title: "Salon Visit",
    description: "Book hair, grooming, or beauty service visits with simple slot confirmation.",
    businessName: "Glow Studio",
    serviceName: "Salon visit",
    location: "Mumbai",
    languageHint: "Hindi, English, Marathi, Hinglish",
    voice: "female",
    brandColor: "#8b3a62",
    slots: "Today 6:30 PM\nTomorrow 1:00 PM\nSunday 4:00 PM",
    greeting: "Hi! Glow Studio mein aapka swagat hai. Aap kaunsi service ke liye visit book karna chahti hain?",
    schedule: salonAllWeek,
  },
  {
    id: "jewellery-store",
    category: "Retail",
    title: "Jewellery Store Visit",
    description: "Schedule showroom visits for bridal, gold, diamond, or custom jewellery consultations.",
    businessName: "Aarav Jewels",
    serviceName: "Store visit",
    location: "Surat",
    languageHint: "Hindi, English, Gujarati, Hinglish",
    voice: "female",
    brandColor: "#9f6b1d",
    slots: "Tomorrow 11:00 AM\nTomorrow 4:30 PM\nSaturday 12:00 PM",
    greeting: "Namaste! Aarav Jewels mein aapka swagat hai. Showroom visit book karni hai ya jewellery ke baare mein kuch jaanna hai?",
    schedule: retailWeekend,
  },
  {
    id: "real-estate-site-visit",
    category: "Real Estate",
    title: "Property Site Visit",
    description: "Capture buyer details and book residential or commercial site visits.",
    businessName: "MetroNest Realty",
    serviceName: "Property site visit",
    location: "Bengaluru",
    languageHint: "Hindi, English, Kannada, Hinglish",
    voice: "male",
    brandColor: "#285b7a",
    slots: "Tomorrow 12:00 PM\nSaturday 10:30 AM\nSunday 5:00 PM",
    greeting: "Namaste! MetroNest Realty se baat kar rahe hain. Property site visit book karni hai?",
    schedule: realEstateAppointments,
  },
  {
    id: "restaurant-table",
    category: "Food",
    title: "Restaurant Table",
    description: "Reserve a table by collecting guest count, mobile number, date, and time.",
    businessName: "Masala House",
    serviceName: "Table reservation",
    location: "Delhi NCR",
    languageHint: "Hindi, English, Hinglish",
    voice: "male",
    brandColor: "#b4432d",
    slots: "Today 8:00 PM\nTomorrow 7:30 PM\nSunday 1:00 PM",
    greeting: "Hello! Masala House mein aapka swagat hai. Table reserve karni hai? Kitne log aane wale hain?",
    schedule: restaurantEvenings,
  },
];
