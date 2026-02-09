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
  limit,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Expense } from '@/types';

const EXPENSES_COLLECTION = 'expenses';

export async function addExpense(
  expense: Omit<Expense, 'id' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, EXPENSES_COLLECTION), {
    ...expense,
    date: Timestamp.fromDate(expense.date),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getMonthlyExpenses(
  year: number,
  month: number
): Promise<Expense[]> {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);

  const q = query(
    collection(db, EXPENSES_COLLECTION),
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
  })) as Expense[];
}

export async function getRecentExpenses(count: number = 5): Promise<Expense[]> {
  const q = query(
    collection(db, EXPENSES_COLLECTION),
    orderBy('date', 'desc'),
    limit(count)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    date: d.data().date.toDate(),
    createdAt: d.data().createdAt?.toDate() || new Date(),
  })) as Expense[];
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, EXPENSES_COLLECTION, id));
}
