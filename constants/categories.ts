import { CategoryType } from '@/types';

export const CATEGORIES: CategoryType[] = [
  { id: 'alimentacion', name: 'Alimentacion', icon: 'fast-food', color: '#F97316' },
  { id: 'transporte', name: 'Transporte', icon: 'car', color: '#3B82F6' },
  { id: 'servicios', name: 'Servicios', icon: 'flash', color: '#8B5CF6' },
  { id: 'entretenimiento', name: 'Entretenimiento', icon: 'game-controller', color: '#EC4899' },
  { id: 'salud', name: 'Salud', icon: 'medkit', color: '#10B981' },
  { id: 'educacion', name: 'Educacion', icon: 'school', color: '#6366F1' },
  { id: 'hogar', name: 'Hogar', icon: 'home', color: '#F59E0B' },
  { id: 'ropa', name: 'Ropa', icon: 'shirt', color: '#14B8A6' },
  { id: 'otros', name: 'Otros', icon: 'ellipsis-horizontal-circle', color: '#6B7280' },
];

export const getCategoryById = (id: string): CategoryType | undefined =>
  CATEGORIES.find((c) => c.id === id);
