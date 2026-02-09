import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  increment,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Goal } from '@/types';
import { Timestamp } from 'firebase/firestore';

const COLLECTION = 'goals';

export async function addGoal(
  goal: Omit<Goal, 'id'>
): Promise<string> {
  const data: any = {
    ...goal,
    deadline: goal.deadline ? Timestamp.fromDate(goal.deadline) : null,
  };
  const docRef = await addDoc(collection(db, COLLECTION), data);
  return docRef.id;
}

export async function getGoals(): Promise<Goal[]> {
  const q = query(collection(db, COLLECTION), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      deadline: data.deadline?.toDate?.() || null,
    } as Goal;
  });
}

export async function contributeToGoal(id: string, amount: number): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    savedAmount: increment(amount),
  });
}

export async function deleteGoal(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
