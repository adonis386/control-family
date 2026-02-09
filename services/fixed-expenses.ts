import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { FixedExpense } from '@/types';

const COLLECTION = 'fixed_expenses';

export async function addFixedExpense(
  expense: Omit<FixedExpense, 'id'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), expense);
  return docRef.id;
}

export async function getFixedExpenses(): Promise<FixedExpense[]> {
  const q = query(collection(db, COLLECTION), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as FixedExpense[];
}

export async function updateFixedExpense(
  id: string,
  data: Partial<Omit<FixedExpense, 'id'>>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteFixedExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
