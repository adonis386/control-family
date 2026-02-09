import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getMonthlyExpenses, deleteExpense } from '@/services/expenses';
import { getCategoryById, CATEGORIES } from '@/constants/categories';
import { Expense } from '@/types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatCurrency(amount: number): string {
  return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadExpenses = useCallback(async () => {
    try {
      const data = await getMonthlyExpenses(currentYear, currentMonth);
      setExpenses(data);
      if (selectedFilter) {
        setFilteredExpenses(data.filter((e) => e.category === selectedFilter));
      } else {
        setFilteredExpenses(data);
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentMonth, currentYear, selectedFilter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadExpenses();
    }, [loadExpenses])
  );

  const handleFilter = (categoryId: string | null) => {
    setSelectedFilter(categoryId);
    if (categoryId) {
      setFilteredExpenses(expenses.filter((e) => e.category === categoryId));
    } else {
      setFilteredExpenses(expenses);
    }
  };

  const handleDelete = (expense: Expense) => {
    Alert.alert(
      'Eliminar Gasto',
      `Eliminar "${expense.description}" por ${formatCurrency(expense.amount)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(expense.id);
              loadExpenses();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el gasto');
            }
          },
        },
      ]
    );
  };

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedFilter(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedFilter(null);
  };

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const renderExpenseItem = ({ item }: { item: Expense }) => {
    const category = getCategoryById(item.category);
    return (
      <TouchableOpacity
        style={styles.expenseCard}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.expenseIcon, { backgroundColor: (category?.color || '#6B7280') + '20' }]}>
          <Ionicons
            name={(category?.icon || 'ellipsis-horizontal-circle') as any}
            size={22}
            color={category?.color || '#6B7280'}
          />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDescription} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={styles.expenseMeta}>
            {item.userName} · {item.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <View style={styles.expenseRight}>
          <Text style={styles.expenseAmount}>-{formatCurrency(item.amount)}</Text>
          <Text style={styles.expenseCategoryLabel}>{category?.name || item.category}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Historial</Text>
      </View>

      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.monthArrow}>
          <Ionicons name="chevron-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {MONTHS[currentMonth]} {currentYear}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.monthArrow}>
          <Ionicons name="chevron-forward" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <FlatList
        horizontal
        data={[{ id: null, name: 'Todos', icon: 'apps', color: '#3B82F6' }, ...CATEGORIES]}
        keyExtractor={(item) => item.id || 'all'}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
        renderItem={({ item }) => {
          const isSelected = selectedFilter === item.id;
          return (
            <TouchableOpacity
              style={[
                styles.filterChip,
                isSelected && { backgroundColor: (item.color || '#3B82F6'), borderColor: item.color || '#3B82F6' },
              ]}
              onPress={() => handleFilter(item.id)}
            >
              <Text
                style={[styles.filterText, isSelected && { color: '#FFFFFF' }]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Total */}
      <View style={styles.totalBar}>
        <Text style={styles.totalLabel}>Total: </Text>
        <Text style={styles.totalAmount}>{formatCurrency(totalFiltered)}</Text>
        <Text style={styles.totalCount}> ({filteredExpenses.length} gastos)</Text>
      </View>

      {/* Expenses List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={filteredExpenses}
          keyExtractor={(item) => item.id}
          renderItem={renderExpenseItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadExpenses(); }} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyText}>Sin gastos este mes</Text>
              <Text style={styles.emptySubtext}>Los gastos que registres apareceran aqui</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 20,
  },
  monthArrow: {
    padding: 8,
  },
  monthText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
    minWidth: 160,
    textAlign: 'center',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  totalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  totalLabel: {
    fontSize: 15,
    color: '#64748B',
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  totalCount: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  expenseIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  expenseCategoryLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
