export function getAge(dateOfBirth) {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (hrs < 24) return `${hrs}h`;
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString('en-MW');
}

export function formatMessageTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-MW', { hour: '2-digit', minute: '2-digit' });
}

export function parseJson(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

export const malawiCities = [
  'Blantyre', 'Lilongwe', 'Mzuzu', 'Zomba', 'Kasungu',
  'Mangochi', 'Karonga', 'Salima', 'Nkhotakota', 'Ntcheu',
  'Mulanje', 'Mchinji', 'Dedza', 'Ntchisi', 'Balaka',
  'Neno', 'Thyolo', 'Chiradzulu', 'Phalombe', 'Machinga',
  'Mwanza', 'Chikwawa', 'Nsanje', 'Liwonde', 'Cape Maclear',
];

export const interests = [
  'Music', 'Dancing', 'Cooking', 'Travel', 'Sports',
  'Reading', 'Movies', 'Nature', 'Photography', 'Art',
  'Gaming', 'Fitness', 'Foodie', 'Church', 'Culture',
  'Drama', 'Poetry', 'Hiking', 'Swimming', 'Cycling',
  'Fashion', 'Technology', 'Volunteering', 'Farming', 'Language',
];

export const reportReasons = [
  'Inappropriate content', 'Fake profile', 'Harassment',
  'Spam', 'Underage user', 'Other',
];
