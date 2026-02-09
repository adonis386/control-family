import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Income } from '@/types';

const INCOMES_COLLECTION = 'incomes';

export async function addIncome(
  income: Omit<Income, 'id' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, INCOMES_COLLECTION), {
    ...income,
    date: Timestamp.fromDate(income.date),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getMonthlyIncomes(
  year: number,
  month: number
): Promise<Income[]> {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);

  const q = query(
    collection(db, INCOMES_COLLECTION),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    date: d.data().date.toDate(),
    createdAt: d.data().createdAt?.toDate() || new Date(),
  })) as Income[];
}

export async function deleteIncome(id: string): Promise<void> {
  await deleteDoc(doc(db, INCOMES_COLLECTION, id));
}
