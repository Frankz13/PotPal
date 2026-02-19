import type { UnitCare } from '@/lib/care';

export type UnitPhoto = {
  id: string;
  unitId: string;
  path: string;
  createdAt: string;
};

export type Unit = {
  id: string;
  name: string;
  location: string;
  notes?: string;
  createdAt: string;
  photos: UnitPhoto[];
  care: UnitCare;
};
