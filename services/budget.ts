import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

const SETTINGS_DOC = 'settings/budget';

export async function getMonthlyBudget(): Promise<number> {
  try {
    const budgetDoc = await getDoc(doc(db, SETTINGS_DOC));
    if (budgetDoc.exists()) {
      return budgetDoc.data().monthlyBudget || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error fetching budget:', error);
    return 0;
  }
}

export async function setMonthlyBudget(amount: number): Promise<void> {
  await setDoc(doc(db, SETTINGS_DOC), { monthlyBudget: amount }, { merge: true });
}
