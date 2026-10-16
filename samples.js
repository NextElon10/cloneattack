// Pre-cached personas: instant, offline-safe demo data.
// Every phrase.text must appear verbatim in the bio; attack messages use the same exact text.
window.SAMPLES = {
  student: {
    bio: "Harshal | CSE 2nd year @ XYZ University | Hostel B | AI & Web3 Enthusiast | Football, F1 & Gym | Building in Public | Mumbai 📍 | Dog Lover 🐶",
    data: {
      phrases: [
        { text: "Harshal", weight: 10, generic: "there", fix: "Use a nickname or initial instead of your real first name" },
        { text: "CSE 2nd year", weight: 14, generic: "your branch", fix: "Drop your branch and year: it lets scammers pose as 'seniors'" },
        { text: "XYZ University", weight: 16, generic: "your college", fix: "Hide your college name or limit it to friends-only" },
        { text: "Hostel B", weight: 18, generic: "your hostel", fix: "Remove your hostel name: it pinpoints where you live" },
        { text: "AI & Web3", weight: 8, generic: "tech", fix: "Keep interests vague: they make fake 'opportunities' feel tailored" },
        { text: "Mumbai", weight: 10, generic: "your city", fix: "Remove your home city or location pin" },
        { text: "Dog Lover", weight: 6, generic: "pet lover", fix: "Avoid pet details: they're common security-question answers" }
      ],
      attacks: [
        { type: "dm", title: "Fake DM", subtitle: "Fake senior asking for UPI help",
          message: "Hey Harshal! Saw you're in Hostel B and CSE 2nd year. I'm a senior from your department. I'm stuck outside campus rn, my UPI isn't working. Could you send ₹2,000? I'll return it tomorrow 🙏",
          uses: ["Hostel B", "CSE 2nd year", "Harshal"] },
        { type: "boss", title: "Boss WhatsApp", subtitle: "Fake internship / placement update",
          message: "Hi Harshal, this is from the XYZ University placement team. We're shortlisting CSE 2nd year students for a special AI & Web3 internship. Can you share your updated resume and Aadhaar copy for a quick verification today?",
          uses: ["XYZ University", "CSE 2nd year", "AI & Web3", "Harshal"] },
        { type: "call", title: "Call Script", subtitle: "Fake delivery / OTP verification",
          message: "Hello Harshal, this is the courier desk. We have a parcel from Mumbai for you at Hostel B, XYZ University, but there's an address issue. Please read out the OTP I'm sending to confirm delivery.",
          uses: ["Harshal", "Hostel B", "Mumbai", "XYZ University"] }
      ]
    }
  },

  hr: {
    bio: "Priya Sharma | HR Manager at Nexora Technologies | Hiring for SDE & Data roles | Pune | MBA, Symbiosis '18 | Proud mom of Aarav 👶 | Marathon runner 🏃‍♀️",
    data: {
      phrases: [
        { text: "Priya", weight: 10, generic: "there", fix: "Use a professional handle instead of your full name on public posts" },
        { text: "HR Manager", weight: 10, generic: "the HR team", fix: "Your role tells attackers you can approve payments: limit who sees it" },
        { text: "Nexora Technologies", weight: 16, generic: "your company", fix: "Verify any 'leadership' request on a known number, never the one that messaged you" },
        { text: "Hiring for SDE & Data roles", weight: 12, generic: "hiring", fix: "Post openings via the company careers page, not your personal profile" },
        { text: "Pune", weight: 8, generic: "your city", fix: "Remove your city from your personal bio" },
        { text: "Symbiosis", weight: 8, generic: "your college", fix: "Alumni ties are used to build fake trust: hide them on personal accounts" },
        { text: "Aarav", weight: 18, generic: "your child", fix: "Never name your child publicly: it powers fake-emergency scams" },
        { text: "Marathon runner", weight: 6, generic: "runner", fix: "Avoid sharing routines that reveal when you're away" }
      ],
      attacks: [
        { type: "dm", title: "Fake DM", subtitle: "Fake candidate with a malicious file",
          message: "Hi Priya! Saw you're Hiring for SDE & Data roles. I'm a fellow Symbiosis alum. I've sent my resume as a file below. Could you open it and refer me today? 🙏",
          uses: ["Priya", "Hiring for SDE & Data roles", "Symbiosis"] },
        { type: "boss", title: "Boss WhatsApp", subtitle: "CEO fraud / urgent payment",
          message: "Hi Priya, it's Rohit from Nexora Technologies leadership. I'm in a board meeting and can't call. As HR Manager, please release a ₹45,000 joining advance for a new hire today. Keep it confidential till the offer is out.",
          uses: ["Priya", "Nexora Technologies", "HR Manager"] },
        { type: "call", title: "Call Script", subtitle: "Fake emergency about your child",
          message: "Hello Priya, calling from Aarav's daycare in Pune. He's okay but had a small fall. The hospital needs a ₹5,000 deposit on UPI right now before treatment. Please hurry.",
          uses: ["Priya", "Aarav", "Pune"] }
      ]
    }
  },

  parent: {
    bio: "Rajesh Iyer | Proud dad of Ananya (Class 8, DPS Bangalore) & Kabir | Branch Manager at SBI | Koramangala, Bangalore | Golden retriever Bruno 🐕 | Weekend cricket @ HSR",
    data: {
      phrases: [
        { text: "Rajesh", weight: 10, generic: "there", fix: "Use a nickname or initial instead of your real name" },
        { text: "Ananya", weight: 18, generic: "your daughter", fix: "Never post your child's name: it powers 'new number' scams" },
        { text: "DPS Bangalore", weight: 14, generic: "her school", fix: "Remove your child's school and class" },
        { text: "Kabir", weight: 8, generic: "your son", fix: "Remove family members' names from your bio" },
        { text: "SBI", weight: 14, generic: "your bank", fix: "Your employer makes fake 'regional office' calls believable: hide it" },
        { text: "Koramangala", weight: 12, generic: "your area", fix: "Remove your neighbourhood: it narrows down your home" },
        { text: "Bruno", weight: 10, generic: "your dog", fix: "Pet names are classic security-question answers: drop them" }
      ],
      attacks: [
        { type: "dm", title: "Fake DM", subtitle: "Child texting from a 'new number'",
          message: "Papa, it's Ananya. My phone fell in water, this is my friend's number. Need ₹3,000 for the DPS Bangalore trip fee today. Please don't tell Mumma, I'll explain at home 🙏",
          uses: ["Ananya", "DPS Bangalore"] },
        { type: "boss", title: "Boss WhatsApp", subtitle: "Fake head-office KYC audit",
          message: "Hello Rajesh, this is from the SBI regional office. Urgent KYC audit for all branch staff in Koramangala. Share the OTP you'll receive to confirm your employee ID before 5 PM.",
          uses: ["Rajesh", "SBI", "Koramangala"] },
        { type: "call", title: "Call Script", subtitle: "Fake lost-pet emergency",
          message: "Hello Rajesh, we found your golden retriever Bruno near Koramangala. He's safe but injured. The vet needs a ₹2,500 advance on UPI before treating him. Kabir gave us this number.",
          uses: ["Rajesh", "Bruno", "Koramangala", "Kabir"] }
      ]
    }
  }
};
