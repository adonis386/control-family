import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getMonthlyExpenses, getRecentExpenses } from '@/services/expenses';
import { getMonthlyBudget } from '@/services/budget';
import { getCategoryById } from '@/constants/categories';
import { Expense } from '@/types';

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
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const currentMonth = MONTHS[now.getMonth()];
  const currentYear = now.getFullYear();

  const loadData = useCallback(async () => {
    try {
      const [expenses, recent, budgetAmount] = await Promise.all([
        getMonthlyExpenses(now.getFullYear(), now.getMonth()),
        getRecentExpenses(5),
        getMonthlyBudget(),
      ]);
      setMonthlyExpenses(expenses);
      setRecentExpenses(recent);
      setBudget(budgetAmount);
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
  const remaining = budget - totalSpent;
  const budgetProgress = budget > 0 ? Math.min(totalSpent / budget, 1) : 0;

  // Group by category
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

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total gastado este mes</Text>
        <Text style={styles.summaryAmount}>{formatCurrency(totalSpent)}</Text>

        {budget > 0 && (
          <>
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
            <View style={styles.budgetRow}>
              <Text style={styles.budgetText}>
                Presupuesto: {formatCurrency(budget)}
              </Text>
              <Text
                style={[
                  styles.remainingText,
                  { color: remaining >= 0 ? '#10B981' : '#EF4444' },
                ]}
              >
                {remaining >= 0 ? 'Disponible' : 'Excedido'}: {formatCurrency(Math.abs(remaining))}
              </Text>
            </View>
          </>
        )}

        {budget === 0 && (
          <Text style={styles.noBudgetText}>
            Configura tu presupuesto mensual en Perfil
          </Text>
        )}
      </View>

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
                          {
                            width: `${percentage}%`,
                            backgroundColor: category?.color || '#6B7280',
                          },
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
        <Text style={styles.sectionTitle}>Ultimos Gastos</Text>
        {recentExpenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No hay gastos registrados</Text>
            <Text style={styles.emptySubtext}>Agrega tu primer gasto</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E293B',
  },
  date: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 2,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  remainingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  noBudgetText: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  categoriesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '35%',
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 14,
    color: '#374151',
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  categoryBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBar: {
    height: '100%',
    borderRadius: 3,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    minWidth: 80,
    textAlign: 'right',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  expensesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  expenseRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  expenseMeta: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
});
