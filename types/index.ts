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

export interface CategoryType {
  id: string;
  name: string;
  icon: string;
  color: string;
}
