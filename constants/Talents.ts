export interface Talent {
  id: string;
  name: string;
  icon: string;
}

export const TALENTS: Talent[] = [
  { id: '1', name: 'Futbol', icon: 'football-outline' },
  { id: '2', name: 'Basketbol', icon: 'basketball-outline' },
  { id: '3', name: 'Müzik', icon: 'musical-notes-outline' },
  { id: '4', name: 'Dans', icon: 'body-outline' },
  { id: '5', name: 'Fotoğrafçılık', icon: 'camera-outline' },
  { id: '6', name: 'Videografi', icon: 'videocam-outline' },
  { id: '7', name: 'Resim', icon: 'brush-outline' },
  { id: '8', name: 'Yemek', icon: 'restaurant-outline' },
  { id: '9', name: 'Seyahat', icon: 'airplane-outline' },
  { id: '10', name: 'Fitness', icon: 'barbell-outline' },
  { id: '11', name: 'Teknoloji', icon: 'hardware-chip-outline' },
  { id: '12', name: 'Moda', icon: 'shirt-outline' },
  { id: '13', name: 'Yazarlık', icon: 'pencil-outline' },
  { id: '14', name: 'Oyunculuk', icon: 'film-outline' },
  { id: '15', name: 'Girişimcilik', icon: 'rocket-outline' },
];

export const getTalentById = (id: string): Talent | undefined => {
  return TALENTS.find(t => t.id === id);
};

export const getTalentByName = (name: string): Talent | undefined => {
  return TALENTS.find(t => t.name.toLowerCase() === name.toLowerCase());
};

