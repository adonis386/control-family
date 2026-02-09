import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getMonthlyExpenses, getRecentExpenses } from '@/services/expenses';
import { getMonthlyIncomes } from '@/services/income';
import { getMonthlyBudget } from '@/services/budget';
import { getFixedExpenses } from '@/services/fixed-expenses';
import { getGoals } from '@/services/goals';
import { getCategoryById } from '@/constants/categories';
import { getSourceById } from '@/constants/income-sources';
import { Expense, Income, FixedExpense, Goal } from '@/types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatCurrency(amount: number): string {
  return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { userData } = useAuth();
  const [monthlyExpenses, setMonthlyExpenses] = useState<Expense[]>([]);
  const [monthlyIncomes, setMonthlyIncomes] = useState<Income[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const currentMonth = MONTHS[now.getMonth()];
  const currentYear = now.getFullYear();

  const loadData = useCallback(async () => {
    try {
      const [expenses, incomes, recent, budgetAmount, fixed, goalsList] = await Promise.all([
        getMonthlyExpenses(now.getFullYear(), now.getMonth()),
        getMonthlyIncomes(now.getFullYear(), now.getMonth()),
        getRecentExpenses(5),
        getMonthlyBudget(),
        getFixedExpenses(),
        getGoals(),
      ]);
      setMonthlyExpenses(expenses);
      setMonthlyIncomes(incomes);
      setRecentExpenses(recent);
      setBudget(budgetAmount);
      setFixedExpenses(fixed);
      setGoals(goalsList);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = monthlyIncomes.reduce((sum, i) => sum + i.amount, 0);
  const balance = totalIncome - totalSpent;
  const totalFixed = fixedExpenses.reduce((sum, f) => sum + f.amount, 0);
  const budgetProgress = budget > 0 ? Math.min(totalSpent / budget, 1) : 0;

  // Group expenses by category
  const categoryTotals = monthlyExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryTotals).sort(
    ([, a], [, b]) => b - a
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {userData?.name || 'Usuario'}</Text>
          <Text style={styles.date}>{currentMonth} {currentYear}</Text>
        </View>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {(userData?.name || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Balance del mes</Text>
        <Text style={[styles.balanceAmount, { color: balance >= 0 ? '#34D399' : '#F87171' }]}>
          {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
        </Text>

        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <View style={[styles.balanceIconCircle, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="arrow-up" size={16} color="#10B981" />
            </View>
            <View>
              <Text style={styles.balanceItemLabel}>Ingresos</Text>
              <Text style={[styles.balanceItemAmount, { color: '#34D399' }]}>
                {formatCurrency(totalIncome)}
              </Text>
            </View>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <View style={[styles.balanceIconCircle, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="arrow-down" size={16} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.balanceItemLabel}>Gastos</Text>
              <Text style={[styles.balanceItemAmount, { color: '#F87171' }]}>
                {formatCurrency(totalSpent)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Budget Progress */}
      {budget > 0 && (
        <View style={styles.budgetCard}>
          <View style={styles.budgetHeader}>
            <Text style={styles.budgetTitle}>Presupuesto</Text>
            <Text style={styles.budgetFraction}>
              {formatCurrency(totalSpent)} / {formatCurrency(budget)}
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${budgetProgress * 100}%`,
                  backgroundColor:
                    budgetProgress > 0.9 ? '#EF4444' : budgetProgress > 0.7 ? '#F59E0B' : '#10B981',
                },
              ]}
            />
          </View>
          <Text style={styles.budgetRemaining}>
            {budget - totalSpent >= 0
              ? `Disponible: ${formatCurrency(budget - totalSpent)}`
              : `Excedido por: ${formatCurrency(totalSpent - budget)}`}
          </Text>
        </View>
      )}

      {/* Fixed Expenses */}
      {fixedExpenses.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Gastos Fijos</Text>
            <Text style={styles.sectionTotal}>{formatCurrency(totalFixed)}/mes</Text>
          </View>
          <View style={styles.fixedCard}>
            {fixedExpenses.slice(0, 4).map((fixed, index) => {
              const category = getCategoryById(fixed.category);
              return (
                <View
                  key={fixed.id}
                  style={[styles.fixedRow, index < Math.min(fixedExpenses.length, 4) - 1 && styles.fixedRowBorder]}
                >
                  <View style={[styles.fixedIcon, { backgroundColor: (category?.color || '#6B7280') + '20' }]}>
                    <Ionicons
                      name={(category?.icon || 'ellipsis-horizontal-circle') as any}
                      size={18}
                      color={category?.color || '#6B7280'}
                    />
                  </View>
                  <Text style={styles.fixedName} numberOfLines={1}>{fixed.name}</Text>
                  <Text style={styles.fixedAmount}>{formatCurrency(fixed.amount)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Goals */}
      {goals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metas de Ahorro</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goalsScroll}>
            {goals.map((goal) => {
              const progress = goal.targetAmount > 0 ? Math.min(goal.savedAmount / goal.targetAmount, 1) : 0;
              return (
                <View key={goal.id} style={[styles.goalCard, { borderLeftColor: goal.color || '#3B82F6' }]}>
                  <View style={styles.goalHeader}>
                    <Ionicons name={(goal.icon || 'flag') as any} size={20} color={goal.color || '#3B82F6'} />
                    <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
                  </View>
                  <Text style={styles.goalAmounts}>
                    {formatCurrency(goal.savedAmount)} / {formatCurrency(goal.targetAmount)}
                  </Text>
                  <View style={styles.goalBarContainer}>
                    <View style={[styles.goalBar, { width: `${progress * 100}%`, backgroundColor: goal.color || '#3B82F6' }]} />
                  </View>
                  <Text style={styles.goalPercent}>{Math.round(progress * 100)}%</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Category Breakdown */}
      {sortedCategories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gastos por Categoria</Text>
          <View style={styles.categoriesCard}>
            {sortedCategories.map(([catId, amount]) => {
              const category = getCategoryById(catId);
              const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
              return (
                <View key={catId} style={styles.categoryRow}>
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryDot, { backgroundColor: category?.color || '#6B7280' }]} />
                    <Text style={styles.categoryName}>{category?.name || catId}</Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <View style={styles.categoryBarContainer}>
                      <View
                        style={[
                          styles.categoryBar,
                          { width: `${percentage}%`, backgroundColor: category?.color || '#6B7280' },
                        ]}
                      />
                    </View>
                    <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Recent Expenses */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ultimos Movimientos</Text>
        {recentExpenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No hay movimientos</Text>
            <Text style={styles.emptySubtext}>Agrega tu primer gasto o ingreso</Text>
          </View>
        ) : (
          <View style={styles.expensesCard}>
            {recentExpenses.map((expense, index) => {
              const category = getCategoryById(expense.category);
              return (
                <View
                  key={expense.id}
                  style={[
                    styles.expenseRow,
                    index < recentExpenses.length - 1 && styles.expenseRowBorder,
                  ]}
                >
                  <View style={[styles.expenseIcon, { backgroundColor: (category?.color || '#6B7280') + '20' }]}>
                    <Ionicons
                      name={(category?.icon || 'ellipsis-horizontal-circle') as any}
                      size={20}
                      color={category?.color || '#6B7280'}
                    />
                  </View>
                  <View style={styles.expenseInfo}>
                    <Text style={styles.expenseDescription} numberOfLines={1}>
                      {expense.description}
                    </Text>
                    <Text style={styles.expenseMeta}>
                      {expense.userName} · {expense.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <Text style={styles.expenseAmount}>
                    -{formatCurrency(expense.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 26, fontWeight: '700', color: '#1E293B' },
  date: { fontSize: 15, color: '#64748B', marginTop: 2 },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },

  // Balance Card
  balanceCard: {
    backgroundColor: '#1E293B', borderRadius: 20, padding: 24, marginBottom: 16,
    shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  balanceLabel: { fontSize: 14, color: '#94A3B8', marginBottom: 4 },
  balanceAmount: { fontSize: 36, fontWeight: '700', marginBottom: 20 },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  balanceItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  balanceIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  balanceItemLabel: { fontSize: 12, color: '#94A3B8' },
  balanceItemAmount: { fontSize: 16, fontWeight: '700' },
  balanceDivider: { width: 1, height: 36, backgroundColor: '#334155', marginHorizontal: 12 },

  // Budget
  budgetCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  budgetTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  budgetFraction: { fontSize: 13, color: '#64748B' },
  progressBarContainer: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBar: { height: '100%', borderRadius: 4 },
  budgetRemaining: { fontSize: 13, color: '#64748B' },

  // Fixed
  fixedCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  fixedRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  fixedRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  fixedIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  fixedName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1E293B' },
  fixedAmount: { fontSize: 14, fontWeight: '600', color: '#EF4444' },

  // Goals
  goalsScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  goalCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginRight: 12, width: 180,
    borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  goalName: { fontSize: 14, fontWeight: '600', color: '#1E293B', flex: 1 },
  goalAmounts: { fontSize: 12, color: '#64748B', marginBottom: 8 },
  goalBarContainer: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  goalBar: { height: '100%', borderRadius: 3 },
  goalPercent: { fontSize: 12, fontWeight: '600', color: '#64748B' },

  // Sections
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTotal: { fontSize: 14, fontWeight: '600', color: '#EF4444' },

  // Categories
  categoriesCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', width: '35%' },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  categoryName: { fontSize: 14, color: '#374151' },
  categoryRight: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  categoryBarContainer: { flex: 1, height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  categoryBar: { height: '100%', borderRadius: 3 },
  categoryAmount: { fontSize: 14, fontWeight: '600', color: '#1E293B', minWidth: 80, textAlign: 'right' },

  // Expenses
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 40, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  expensesCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  expenseRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  expenseIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  expenseInfo: { flex: 1 },
  expenseDescription: { fontSize: 15, fontWeight: '500', color: '#1E293B' },
  expenseMeta: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  expenseAmount: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
});
