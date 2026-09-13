/**
 * The 64 districts of Bangladesh, grouped by division.
 *
 * Used by checkout (and anywhere else that needs a district picker). `value` is
 * the canonical English name — it is what gets stored on the order snapshot —
 * while `label`/`labelBn` are display-only.
 */

export type District = {
  value: string;
  label: string;
  labelBn: string;
  division: string;
};

export const DISTRICTS: District[] = [
  // Dhaka Division
  { value: 'Dhaka', label: 'Dhaka', labelBn: 'ঢাকা', division: 'Dhaka' },
  { value: 'Faridpur', label: 'Faridpur', labelBn: 'ফরিদপুর', division: 'Dhaka' },
  { value: 'Gazipur', label: 'Gazipur', labelBn: 'গাজীপুর', division: 'Dhaka' },
  { value: 'Gopalganj', label: 'Gopalganj', labelBn: 'গোপালগঞ্জ', division: 'Dhaka' },
  { value: 'Kishoreganj', label: 'Kishoreganj', labelBn: 'কিশোরগঞ্জ', division: 'Dhaka' },
  { value: 'Madaripur', label: 'Madaripur', labelBn: 'মাদারীপুর', division: 'Dhaka' },
  { value: 'Manikganj', label: 'Manikganj', labelBn: 'মানিকগঞ্জ', division: 'Dhaka' },
  { value: 'Munshiganj', label: 'Munshiganj', labelBn: 'মুন্সিগঞ্জ', division: 'Dhaka' },
  { value: 'Narayanganj', label: 'Narayanganj', labelBn: 'নারায়ণগঞ্জ', division: 'Dhaka' },
  { value: 'Narsingdi', label: 'Narsingdi', labelBn: 'নরসিংদী', division: 'Dhaka' },
  { value: 'Rajbari', label: 'Rajbari', labelBn: 'রাজবাড়ী', division: 'Dhaka' },
  { value: 'Shariatpur', label: 'Shariatpur', labelBn: 'শরীয়তপুর', division: 'Dhaka' },
  { value: 'Tangail', label: 'Tangail', labelBn: 'টাঙ্গাইল', division: 'Dhaka' },

  // Chattogram Division
  { value: 'Bandarban', label: 'Bandarban', labelBn: 'বান্দরবান', division: 'Chattogram' },
  { value: 'Brahmanbaria', label: 'Brahmanbaria', labelBn: 'ব্রাহ্মণবাড়িয়া', division: 'Chattogram' },
  { value: 'Chandpur', label: 'Chandpur', labelBn: 'চাঁদপুর', division: 'Chattogram' },
  { value: 'Chattogram', label: 'Chattogram', labelBn: 'চট্টগ্রাম', division: 'Chattogram' },
  { value: 'Cumilla', label: 'Cumilla', labelBn: 'কুমিল্লা', division: 'Chattogram' },
  { value: "Cox's Bazar", label: "Cox's Bazar", labelBn: 'কক্সবাজার', division: 'Chattogram' },
  { value: 'Feni', label: 'Feni', labelBn: 'ফেনী', division: 'Chattogram' },
  { value: 'Khagrachhari', label: 'Khagrachhari', labelBn: 'খাগড়াছড়ি', division: 'Chattogram' },
  { value: 'Lakshmipur', label: 'Lakshmipur', labelBn: 'লক্ষ্মীপুর', division: 'Chattogram' },
  { value: 'Noakhali', label: 'Noakhali', labelBn: 'নোয়াখালী', division: 'Chattogram' },
  { value: 'Rangamati', label: 'Rangamati', labelBn: 'রাঙ্গামাটি', division: 'Chattogram' },

  // Rajshahi Division
  { value: 'Bogura', label: 'Bogura', labelBn: 'বগুড়া', division: 'Rajshahi' },
  {
    value: 'Chapainawabganj',
    label: 'Chapainawabganj',
    labelBn: 'চাঁপাইনবাবগঞ্জ',
    division: 'Rajshahi',
  },
  { value: 'Joypurhat', label: 'Joypurhat', labelBn: 'জয়পুরহাট', division: 'Rajshahi' },
  { value: 'Naogaon', label: 'Naogaon', labelBn: 'নওগাঁ', division: 'Rajshahi' },
  { value: 'Natore', label: 'Natore', labelBn: 'নাটোর', division: 'Rajshahi' },
  { value: 'Pabna', label: 'Pabna', labelBn: 'পাবনা', division: 'Rajshahi' },
  { value: 'Rajshahi', label: 'Rajshahi', labelBn: 'রাজশাহী', division: 'Rajshahi' },
  { value: 'Sirajganj', label: 'Sirajganj', labelBn: 'সিরাজগঞ্জ', division: 'Rajshahi' },

  // Khulna Division
  { value: 'Bagerhat', label: 'Bagerhat', labelBn: 'বাগেরহাট', division: 'Khulna' },
  { value: 'Chuadanga', label: 'Chuadanga', labelBn: 'চুয়াডাঙ্গা', division: 'Khulna' },
  { value: 'Jashore', label: 'Jashore', labelBn: 'যশোর', division: 'Khulna' },
  { value: 'Jhenaidah', label: 'Jhenaidah', labelBn: 'ঝিনাইদহ', division: 'Khulna' },
  { value: 'Khulna', label: 'Khulna', labelBn: 'খুলনা', division: 'Khulna' },
  { value: 'Kushtia', label: 'Kushtia', labelBn: 'কুষ্টিয়া', division: 'Khulna' },
  { value: 'Magura', label: 'Magura', labelBn: 'মাগুরা', division: 'Khulna' },
  { value: 'Meherpur', label: 'Meherpur', labelBn: 'মেহেরপুর', division: 'Khulna' },
  { value: 'Narail', label: 'Narail', labelBn: 'নড়াইল', division: 'Khulna' },
  { value: 'Satkhira', label: 'Satkhira', labelBn: 'সাতক্ষীরা', division: 'Khulna' },

  // Barishal Division
  { value: 'Barguna', label: 'Barguna', labelBn: 'বরগুনা', division: 'Barishal' },
  { value: 'Barishal', label: 'Barishal', labelBn: 'বরিশাল', division: 'Barishal' },
  { value: 'Bhola', label: 'Bhola', labelBn: 'ভোলা', division: 'Barishal' },
  { value: 'Jhalokati', label: 'Jhalokati', labelBn: 'ঝালকাঠি', division: 'Barishal' },
  { value: 'Patuakhali', label: 'Patuakhali', labelBn: 'পটুয়াখালী', division: 'Barishal' },
  { value: 'Pirojpur', label: 'Pirojpur', labelBn: 'পিরোজপুর', division: 'Barishal' },

  // Sylhet Division
  { value: 'Habiganj', label: 'Habiganj', labelBn: 'হবিগঞ্জ', division: 'Sylhet' },
  { value: 'Moulvibazar', label: 'Moulvibazar', labelBn: 'মৌলভীবাজার', division: 'Sylhet' },
  { value: 'Sunamganj', label: 'Sunamganj', labelBn: 'সুনামগঞ্জ', division: 'Sylhet' },
  { value: 'Sylhet', label: 'Sylhet', labelBn: 'সিলেট', division: 'Sylhet' },

  // Rangpur Division
  { value: 'Dinajpur', label: 'Dinajpur', labelBn: 'দিনাজপুর', division: 'Rangpur' },
  { value: 'Gaibandha', label: 'Gaibandha', labelBn: 'গাইবান্ধা', division: 'Rangpur' },
  { value: 'Kurigram', label: 'Kurigram', labelBn: 'কুরিগ্রাম', division: 'Rangpur' },
  { value: 'Lalmonirhat', label: 'Lalmonirhat', labelBn: 'লালমনিরহাট', division: 'Rangpur' },
  { value: 'Nilphamari', label: 'Nilphamari', labelBn: 'নীলফামারী', division: 'Rangpur' },
  { value: 'Panchagarh', label: 'Panchagarh', labelBn: 'পঞ্চগড়', division: 'Rangpur' },
  { value: 'Rangpur', label: 'Rangpur', labelBn: 'রংপুর', division: 'Rangpur' },
  { value: 'Thakurgaon', label: 'Thakurgaon', labelBn: 'ঠাকুরগাঁও', division: 'Rangpur' },

  // Mymensingh Division
  { value: 'Jamalpur', label: 'Jamalpur', labelBn: 'জামালপুর', division: 'Mymensingh' },
  { value: 'Mymensingh', label: 'Mymensingh', labelBn: 'ময়মনসিংহ', division: 'Mymensingh' },
  { value: 'Netrokona', label: 'Netrokona', labelBn: 'নেত্রকোণা', division: 'Mymensingh' },
  { value: 'Sherpur', label: 'Sherpur', labelBn: 'শেরপুর', division: 'Mymensingh' },
];

/** Districts within Dhaka city limits — everything else ships as "Outside Dhaka". */
export const DHAKA_DISTRICT = 'Dhaka';

export const DEFAULT_DISTRICT = DHAKA_DISTRICT;
