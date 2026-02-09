export interface UserData {
  uid: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  userId: string;
  userName: string;
  date: Date;
  createdAt: Date;
}

export interface Income {
  id: string;
  amount: number;
  description: string;
  source: string;
  userId: string;
  userName: string;
  date: Date;
  createdAt: Date;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  dayOfMonth: number;
  createdBy: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  icon: string;
  color: string;
  deadline: Date | null;
  createdBy: string;
}

export interface CategoryType {
  id: string;
  name: string;
  icon: string;
  color: string;
}
