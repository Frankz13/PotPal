import type { UnitCare } from '@/lib/care';

export type UnitPhoto = {
  id: string;
  unitId: string;
  path: string;
  createdAt: string;
  createdAtISO?: string;
};

export type Unit = {
  id: string;
  name: string;
  species: string;
  location: string;
  notes?: string;
  createdAt: string;
  photos: UnitPhoto[];
  coverPhotoId?: string;
  care: UnitCare;
};
