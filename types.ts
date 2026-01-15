
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
  LIGHT_METER = 'LIGHT_METER'
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
  rating: number; // 1-10
}

export interface FilmPhoto {
  id: string;
  url: string;
  exif?: ExifData; // Per-photo override
  analysis?: PhotoAnalysis; // AI Analysis data
}

export interface Roll {
  id: string;
  brand: string;
  name: string;
  iso: number;
  camera: string; // Used as default for EXIF
  date: string;
  status: RollStatus;
  coverImage: string;
  photos: FilmPhoto[];
  framesTaken: number;
  totalFrames: number;
  defaultExif?: ExifData; // Batch defaults
}

export interface UserProfile {
  name: string;
  role: string; // e.g., "Archivist since 2021"
  avatar: string;
  bio?: string;
  favoriteCamera?: string;
  favoriteFilm?: string;
  website?: string;
}
