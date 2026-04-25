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
    voice: "ara",
    brandColor: "#0d6b57",
    slots: "Tomorrow 10:30 AM\nTomorrow 5:00 PM\nSaturday 11:45 AM",
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
    voice: "eve",
    brandColor: "#8b3a62",
    slots: "Today 6:30 PM\nTomorrow 1:00 PM\nSunday 4:00 PM",
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
    voice: "ara",
    brandColor: "#9f6b1d",
    slots: "Tomorrow 11:00 AM\nTomorrow 4:30 PM\nSaturday 12:00 PM",
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
    voice: "rex",
    brandColor: "#285b7a",
    slots: "Tomorrow 12:00 PM\nSaturday 10:30 AM\nSunday 5:00 PM",
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
    voice: "sal",
    brandColor: "#b4432d",
    slots: "Today 8:00 PM\nTomorrow 7:30 PM\nSunday 1:00 PM",
  },
];
