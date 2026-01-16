
export enum View {
  SPLASH = 'SPLASH',
  DASHBOARD = 'DASHBOARD',
  LIBRARY = 'LIBRARY',
  SCANNER = 'SCANNER',
  PROFILE = 'PROFILE',
  ROLL_DETAIL = 'ROLL_DETAIL',
  STATS = 'STATS',
  CONTACT_SHEET = 'CONTACT_SHEET',
  DEVELOP_TIMER = 'DEVELOP_TIMER',
  LIGHT_METER = 'LIGHT_METER',
  FRIDGE = 'FRIDGE',
  NEGATIVE_INVERTER = 'NEGATIVE_INVERTER',
  CHEM_CALC = 'CHEM_CALC',
  SCENE_SCOUT = 'SCENE_SCOUT',
  RECIPROCITY_LAB = 'RECIPROCITY_LAB'
}

export enum RollStatus {
  ACTIVE = '拍摄中',
  DEVELOPED = '已冲洗',
  ARCHIVED = '已归档',
  IN_LAB = '冲扫中'
}

export interface ExifData {
  camera: string;
  lens: string;
  aperture?: string;
  shutterSpeed?: string;
  date?: string;
  location?: string;
  copyright?: string;
}

export interface PhotoAnalysis {
  composition: string;
  mood: string;
  tags: string[];
  rating: number; 
}

export interface FilmPhoto {
  id: string;
  url: string;
  exif?: ExifData;
  analysis?: PhotoAnalysis;
}

export interface Roll {
  id: string;
  brand: string;
  name: string;
  iso: number;
  camera: string;
  date: string;
  status: RollStatus;
  coverImage: string;
  photos: FilmPhoto[];
  framesTaken: number;
  totalFrames: number;
  defaultExif?: ExifData;
}

export interface UserSettings {
  tempUnit: 'C' | 'F';
  oledMode: boolean;
  autoAnalyze: boolean;
  defaultDevTemp: number;
}

export interface GearItem {
  id: string;
  type: 'camera' | 'lens';
  model: string;
  brand: string;
}

export interface UserProfile {
  name: string;
  role: string;
  avatar: string;
  bio?: string;
  favoriteCamera?: string;
  favoriteFilm?: string;
  website?: string;
  settings?: UserSettings;
  gear: GearItem[];
}

export interface StockFilm {
  id: string;
  brand: string;
  name: string;
  iso: number;
  expiryDate: string;
  count: number;
  format: '135' | '120' | 'Large';
}
