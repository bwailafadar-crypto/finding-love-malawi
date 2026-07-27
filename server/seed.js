const { sqlite } = require('./config/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const profiles = [
  // WOMEN
  {
    email: 'amina@test.com', password: 'test1234', firstName: 'Amina', lastName: 'Banda',
    dob: '1996-03-12', gender: 'female', lookingFor: 'men', location: 'Blantyre',
    bio: 'Software developer by day, dancer by night. Love exploring new places in Malawi. Looking for someone who can keep up with my energy! 💃',
    occupation: 'Software Developer', education: 'University of Malawi',
    interests: ['Technology', 'Dancing', 'Travel', 'Photography', 'Music'],
    photos: ['https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=600&fit=crop&crop=face'],
  },
  {
    email: 'grace@test.com', password: 'test1234', firstName: 'Grace', lastName: 'Mwale',
    dob: '1998-07-22', gender: 'female', lookingFor: 'men', location: 'Lilongwe',
    bio: 'Medical student at KUHES. Passionate about healthcare and community service. Looking for a genuine connection with someone who values education.',
    occupation: 'Medical Student', education: 'Kamuzu University of Health Sciences',
    interests: ['Church', 'Volunteering', 'Reading', 'Fitness', 'Cooking'],
    photos: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=600&fit=crop&crop=face'],
  },
  {
    email: 'faith@test.com', password: 'test1234', firstName: 'Faith', lastName: 'Chirwa',
    dob: '1994-11-05', gender: 'female', lookingFor: 'men', location: 'Mzuzu',
    bio: 'Teacher who loves children and nature. I spend my weekends hiking in the Viphya mountains. Looking for a hiking buddy who becomes more.',
    occupation: 'High School Teacher', education: 'Mzuzu University',
    interests: ['Hiking', 'Nature', 'Reading', 'Drama', 'Poetry'],
    photos: ['https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=600&fit=crop&crop=face'],
  },
  {
    email: 'tina@test.com', password: 'test1234', firstName: 'Tina', lastName: 'Phiri',
    dob: '1997-01-18', gender: 'female', lookingFor: 'men', location: 'Blantyre',
    bio: 'Fashion designer and entrepreneur. My brand celebrates Malawian culture through modern design. Looking for someone ambitious and fun.',
    occupation: 'Fashion Designer', education: 'Blantyre International University',
    interests: ['Fashion', 'Art', 'Music', 'Foodie', 'Culture'],
    photos: ['https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&h=600&fit=crop&crop=face'],
  },
  {
    email: 'joyce@test.com', password: 'test1234', firstName: 'Joyce', lastName: 'Kamanga',
    dob: '1999-05-30', gender: 'female', lookingFor: 'men', location: 'Zomba',
    bio: 'Law student who loves debate and basketball. I believe in justice and good food. Looking for someone who can challenge me intellectually.',
    occupation: 'Law Student', education: 'University of Malawi, Chancellor College',
    interests: ['Sports', 'Movies', 'Culture', 'Foodie', 'Language'],
    photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop&crop=face'],
  },
  {
    email: 'susan@test.com', password: 'test1234', firstName: 'Susan', lastName: 'Nsenga',
    dob: '1995-09-14', gender: 'female', lookingFor: 'men', location: 'Mangochi',
    bio: 'Tourism operator on Lake Malawi. I know all the best spots at Cape Maclear. Looking for a partner who loves the water as much as I do.',
    occupation: 'Tourism Operator', education: 'Malawi Institute of Tourism',
    interests: ['Swimming', 'Travel', 'Cooking', 'Nature', 'Music'],
    photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop&crop=face'],
  },
  {
    email: 'martha@test.com', password: 'test1234', firstName: 'Martha', lastName: 'Lingani',
    dob: '1993-12-01', gender: 'female', lookingFor: 'men', location: 'Lilongwe',
    bio: 'Banking professional who unwinds with yoga and gardening. I grow the best tomatoes in Area 47. Looking for a down-to-earth partner.',
    occupation: 'Financial Analyst', education: 'College of Accountancy',
    interests: ['Fitness', 'Farming', 'Cooking', 'Reading', 'Movies'],
    photos: ['https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=600&fit=crop&crop=face'],
  },
  {
    email: 'esther@test.com', password: 'test1234', firstName: 'Esther', lastName: 'Gondwe',
    dob: '2000-02-28', gender: 'female', lookingFor: 'men', location: 'Blantyre',
    bio: 'Social media influencer and makeup artist. I believe every person deserves to feel beautiful. Looking for someone who appreciates art.',
    occupation: 'Makeup Artist', education: 'Blantyre Polytechnic',
    interests: ['Fashion', 'Photography', 'Art', 'Music', 'Dancing'],
    photos: ['https://images.unsplash.com/photo-1524638431109-93d95c968f03?w=400&h=600&fit=crop&crop=face'],
  },
  // MEN
  {
    email: 'chikondi@test.com', password: 'test1234', firstName: 'Chikondi', lastName: 'Kamwendo',
    dob: '1995-04-10', gender: 'male', lookingFor: 'women', location: 'Blantyre',
    bio: 'Civil engineer building Malawi\'s future. Weekend footballer and braai master. Looking for a queen who loves football and good food.',
    occupation: 'Civil Engineer', education: 'Polytechnic - University of Malawi',
    interests: ['Sports', 'Foodie', 'Music', 'Travel', 'Gaming'],
    photos: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop&crop=face'],
  },
  {
    email: 'yamikani@test.com', password: 'test1234', firstName: 'Yamikani', lastName: 'Phiri',
    dob: '1997-08-25', gender: 'male', lookingFor: 'women', location: 'Lilongwe',
    bio: 'Photographer capturing Malawi\'s beauty. From Liwonde sunsets to Nyika Plateau, my camera goes everywhere. Looking for my muse.',
    occupation: 'Photographer', education: 'Malawi College of Communication',
    interests: ['Photography', 'Nature', 'Travel', 'Art', 'Hiking'],
    photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop&crop=face'],
  },
  {
    email: 'moses@test.com', password: 'test1234', firstName: 'Moses', lastName: 'Moyo',
    dob: '1994-06-03', gender: 'male', lookingFor: 'women', location: 'Mzuzu',
    bio: 'Agricultural economist working on food security. I believe in sustainable farming and good conversation. Looking for a partner in progress.',
    occupation: 'Agricultural Economist', education: 'LUANAR',
    interests: ['Farming', 'Technology', 'Reading', 'Cycling', 'Cooking'],
    photos: ['https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=600&fit=crop&crop=face'],
  },
  {
    email: 'frank@test.com', password: 'test1234', firstName: 'Frank', lastName: 'Jere',
    dob: '1992-10-20', gender: 'male', lookingFor: 'women', location: 'Blantyre',
    bio: 'Doctor at Queen Elizabeth Central Hospital. I save lives during the day and play guitar at night. Looking for someone who loves music.',
    occupation: 'Doctor', education: 'Kamuzu University of Health Sciences',
    interests: ['Music', 'Fitness', 'Movies', 'Volunteering', 'Language'],
    photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=face'],
  },
  {
    email: 'kondwani@test.com', password: 'test1234', firstName: 'Kondwani', lastName: 'Mvula',
    dob: '1998-01-07', gender: 'male', lookingFor: 'women', location: 'Zomba',
    bio: 'Startup founder building Africa\'s next big thing. Coffee addict and bookworm. Looking for an intellectual partner who dreams big.',
    occupation: 'Entrepreneur', education: 'University of Malawi',
    interests: ['Technology', 'Business', 'Reading', 'Chess', 'Movies'],
    photos: ['https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=600&fit=crop&crop=face'],
  },
  {
    email: 'davie@test.com', password: 'test1234', firstName: 'Davie', lastName: 'Chirwa',
    dob: '1996-11-15', gender: 'male', lookingFor: 'women', location: 'Karonga',
    bio: 'Wildlife conservationist protecting Malawi\'s natural heritage. I live near Lake Malawi and love every sunset. Looking for a nature lover.',
    occupation: 'Wildlife Conservationist', education: 'LUANAR',
    interests: ['Nature', 'Photography', 'Swimming', 'Hiking', 'Farming'],
    photos: ['https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop&crop=face'],
  },
];

function run() {
  console.log('Seeding database...');

  const insertUser = sqlite.prepare('INSERT OR IGNORE INTO users (email, password_hash, is_verified, is_active) VALUES (?, ?, 1, 1)');
  const insertProfile = sqlite.prepare(`
    INSERT OR IGNORE INTO profiles (user_id, first_name, last_name, date_of_birth, gender, looking_for, bio, occupation, education, interests, photos, location_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSub = sqlite.prepare('INSERT OR IGNORE INTO subscriptions (user_id, plan) VALUES (?, ?)');

  const seedAll = sqlite.transaction(() => {
    for (const p of profiles) {
      const hash = bcrypt.hashSync(p.password, 10);
      const result = insertUser.run(p.email, hash);
      const userId = result.lastInsertRowid || sqlite.prepare('SELECT id FROM users WHERE email = ?').get(p.email)?.id;
      if (!userId) continue;

      insertProfile.run(
        userId, p.firstName, p.lastName, p.dob, p.gender, p.lookingFor,
        p.bio, p.occupation, p.education,
        JSON.stringify(p.interests), JSON.stringify(p.photos), p.location
      );
      insertSub.run(userId, 'free');
      console.log(`  Created: ${p.firstName} ${p.lastName} (${p.location})`);
    }
  });

  seedAll();
  console.log(`\nDone! Seeded ${profiles.length} profiles.`);
}

run();
