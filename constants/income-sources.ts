import { CategoryType } from '@/types';

export const INCOME_SOURCES: CategoryType[] = [
  { id: 'sueldo', name: 'Sueldo', icon: 'briefcase', color: '#10B981' },
  { id: 'freelance', name: 'Freelance', icon: 'laptop', color: '#3B82F6' },
  { id: 'venta', name: 'Venta', icon: 'pricetag', color: '#F59E0B' },
  { id: 'regalo', name: 'Regalo', icon: 'gift', color: '#EC4899' },
  { id: 'inversion', name: 'Inversion', icon: 'trending-up', color: '#8B5CF6' },
  { id: 'otro', name: 'Otro', icon: 'ellipsis-horizontal-circle', color: '#6B7280' },
];

export const getSourceById = (id: string): CategoryType | undefined =>
  INCOME_SOURCES.find((s) => s.id === id);
