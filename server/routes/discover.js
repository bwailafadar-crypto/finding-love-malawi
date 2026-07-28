const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

function parseJsonField(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateScore(myProfile, theirProfile, theirUser) {
  let score = 0;
  let reasons = [];

  const myInterests = parseJsonField(myProfile.interests);
  const theirInterests = parseJsonField(theirProfile.interests);
  const shared = myInterests.filter(i => theirInterests.includes(i));
  const interestScore = myInterests.length > 0 ? (shared.length / Math.max(myInterests.length, theirInterests.length)) * 40 : 0;
  score += interestScore;
  if (shared.length > 0) reasons.push(`${shared.length} shared interests`);

  if (myProfile.location_name && theirProfile.location_name) {
    if (myProfile.location_name === theirProfile.location_name) {
      score += 25;
      reasons.push('Same city');
    } else {
      const adjacent = {
        'Blantyre': ['Lilongwe', 'Zomba', 'Thyolo', 'Mulanje', 'Chiradzulu'],
        'Lilongwe': ['Blantyre', 'Kasungu', 'Dedza', 'Mchinji'],
        'Mzuzu': ['Karonga', 'Nkhata Bay'],
        'Zomba': ['Blantyre', 'Machinga', 'Phalombe'],
      };
      if (adjacent[myProfile.location_name]?.includes(theirProfile.location_name)) {
        score += 12;
        reasons.push('Nearby city');
      } else {
        score += 5;
        reasons.push('Different city');
      }
    }
  }

  const myAgeMin = myProfile.age_min || 18;
  const myAgeMax = myProfile.age_max || 50;
  const theirAge = theirProfile.date_of_birth
    ? Math.floor((Date.now() - new Date(theirProfile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 25;
  if (theirAge >= myAgeMin && theirAge <= myAgeMax) {
    score += 20;
    const center = (myAgeMin + myAgeMax) / 2;
    const dist = Math.abs(theirAge - center);
    const range = (myAgeMax - myAgeMin) / 2;
    score += Math.max(0, 5 - (dist / range) * 5);
    reasons.push('Age preference match');
  } else {
    score += Math.max(0, 10 - Math.abs(theirAge - (theirAge < myAgeMin ? myAgeMin : myAgeMax)) * 2);
  }

  const fields = [theirProfile.bio, theirProfile.occupation, theirProfile.education, theirProfile.height];
  const filledFields = fields.filter(f => f && f.toString().trim()).length;
  score += (filledFields / fields.length) * 10;

  const photos = parseJsonField(theirProfile.photos);
  if (photos.length >= 3) score += 5;
  else if (photos.length >= 1) score += 2;

  if (theirProfile.is_verified) {
    score += 5;
    reasons.push('Verified');
  }

  if (theirUser.last_active) {
    const hoursSinceActive = (Date.now() - new Date(theirUser.last_active).getTime()) / (1000 * 60 * 60);
    if (hoursSinceActive < 24) { score += 5; reasons.push('Active today'); }
    else if (hoursSinceActive < 168) { score += 3; }
  }

  if (theirUser.is_boosted) {
    score *= 1.5;
    reasons.push('Boosted');
  }

  if (theirUser.last_active) {
    const hoursSinceActive = (Date.now() - new Date(theirUser.last_active).getTime()) / (1000 * 60 * 60);
    if (hoursSinceActive < 1) { score += 3; reasons.push('Very recently active'); }
    else if (hoursSinceActive < 6) { score += 2; }
  }

  return { score: Math.round(score * 10) / 10, reasons, sharedInterests: shared };
}

router.get('/scored', auth, async (req, res) => {
  try {
    const myProfile = db.query('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
    if (myProfile.rows.length === 0) {
      return res.status(400).json({ error: 'Complete your profile first' });
    }

    const myP = myProfile.rows[0];
    const myAgeMin = myP.age_min || 18;
    const myAgeMax = myP.age_max || 50;

    let genderFilter = '';
    let genderParams = [];
    if (myP.looking_for === 'men') { genderFilter = 'AND p.gender = ?'; genderParams = ['male']; }
    else if (myP.looking_for === 'women') { genderFilter = 'AND p.gender = ?'; genderParams = ['female']; }

    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - myAgeMax - 1);
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - myAgeMin);

    const blockedIds = db.query(
      'SELECT blocked_id FROM blocks WHERE blocker_id = ? UNION SELECT blocker_id FROM blocks WHERE blocked_id = ?',
      [req.user.id, req.user.id]
    );
    const blocked = blockedIds.rows.map(r => r.blocked_id);
    const blockedFilter = blocked.length > 0 ? `AND p.user_id NOT IN (${blocked.map(() => '?').join(',')})` : '';

    const result = db.query(
      `SELECT p.*, u.last_active, u.is_verified as user_verified,
              CASE WHEN EXISTS (SELECT 1 FROM boosts b WHERE b.user_id = u.id AND b.expires_at > datetime('now')) THEN 1 ELSE 0 END as is_boosted,
              i.video_url as video_intro_url
       FROM profiles p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN intros i ON i.user_id = p.user_id
       WHERE p.user_id != ?
         AND u.is_active = 1
         AND p.photos != '[]'
         AND p.date_of_birth <= ?
         AND p.date_of_birth >= ?
         ${genderFilter}
         ${blockedFilter}
         AND p.user_id NOT IN (
           SELECT swiped_id FROM swipes WHERE swiper_id = ?
         )
       ORDER BY is_boosted DESC, RANDOM()
       LIMIT 50`,
      [req.user.id, maxDate.toISOString().split('T')[0], minDate.toISOString().split('T')[0], ...genderParams, ...blocked, req.user.id]
    );

    const scored = result.rows.map(p => {
      const profile = { ...p };
      profile.id = p.user_id;
      profile.photos = parseJsonField(p.photos);
      profile.interests = parseJsonField(p.interests);
      profile.prompts = parseJsonField(p.prompts);
      profile.name = p.first_name;
      const age = p.date_of_birth ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
      profile.age = age;
      profile.location = p.location_name;
      const { score, reasons, sharedInterests } = calculateScore(myP, p, { ...p, is_boosted: !!p.is_boosted });
      const distance = calculateDistance(myP.latitude, myP.longitude, p.latitude, p.longitude);
      return { ...profile, matchScore: score, matchReasons: reasons, sharedInterests, distance };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);

    res.json(scored.slice(0, 20));
  } catch (err) {
    console.error('Scored discover error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
