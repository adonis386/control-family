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
import { getMonthlyIncomes, deleteIncome } from '@/services/income';
import { getCategoryById, CATEGORIES } from '@/constants/categories';
import { getSourceById, INCOME_SOURCES } from '@/constants/income-sources';
import { Expense, Income } from '@/types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatCurrency(amount: number): string {
  return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

type ViewType = 'all' | 'expenses' | 'incomes';

interface TransactionItem {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  description: string;
  categoryOrSource: string;
  userName: string;
  date: Date;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [filtered, setFiltered] = useState<TransactionItem[]>([]);
  const [viewType, setViewType] = useState<ViewType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [expenses, incomes] = await Promise.all([
        getMonthlyExpenses(currentYear, currentMonth),
        getMonthlyIncomes(currentYear, currentMonth),
      ]);

      const items: TransactionItem[] = [
        ...expenses.map((e): TransactionItem => ({
          id: e.id, type: 'expense', amount: e.amount,
          description: e.description, categoryOrSource: e.category,
          userName: e.userName, date: e.date,
        })),
        ...incomes.map((i): TransactionItem => ({
          id: i.id, type: 'income', amount: i.amount,
          description: i.description, categoryOrSource: i.source,
          userName: i.userName, date: i.date,
        })),
      ].sort((a, b) => b.date.getTime() - a.date.getTime());

      setTransactions(items);
      applyFilter(items, viewType);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentMonth, currentYear]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const applyFilter = (items: TransactionItem[], type: ViewType) => {
    if (type === 'all') setFiltered(items);
    else if (type === 'expenses') setFiltered(items.filter((t) => t.type === 'expense'));
    else setFiltered(items.filter((t) => t.type === 'income'));
  };

  const handleViewType = (type: ViewType) => {
    setViewType(type);
    applyFilter(transactions, type);
  };

  const handleDelete = (item: TransactionItem) => {
    const label = item.type === 'expense' ? 'gasto' : 'ingreso';
    Alert.alert(
      `Eliminar ${label}`,
      `Eliminar "${item.description}" por ${formatCurrency(item.amount)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (item.type === 'expense') await deleteExpense(item.id);
              else await deleteIncome(item.id);
              loadData();
            } catch { Alert.alert('Error', 'No se pudo eliminar'); }
          },
        },
      ]
    );
  };

  const goToPrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
    setViewType('all');
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
    setViewType('all');
  };

  const totalExpenses = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncomes = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  const renderItem = ({ item }: { item: TransactionItem }) => {
    const isExpense = item.type === 'expense';
    const meta = isExpense
      ? getCategoryById(item.categoryOrSource)
      : getSourceById(item.categoryOrSource);
    const color = meta?.color || '#6B7280';
    const icon = meta?.icon || 'ellipsis-horizontal-circle';

    return (
      <TouchableOpacity
        style={styles.card}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.cardIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
          <Text style={styles.cardMeta}>
            {item.userName} · {item.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.cardAmount, { color: isExpense ? '#EF4444' : '#10B981' }]}>
            {isExpense ? '-' : '+'}{formatCurrency(item.amount)}
          </Text>
          <Text style={styles.cardCatLabel}>{meta?.name || item.categoryOrSource}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Historial</Text>
      </View>

      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.monthArrow}>
          <Ionicons name="chevron-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.monthText}>{MONTHS[currentMonth]} {currentYear}</Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.monthArrow}>
          <Ionicons name="chevron-forward" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* View Type Toggle */}
      <View style={styles.toggleRow}>
        {([
          { key: 'all', label: 'Todo' },
          { key: 'expenses', label: 'Gastos' },
          { key: 'incomes', label: 'Ingresos' },
        ] as { key: ViewType; label: string }[]).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.toggleBtn, viewType === tab.key && styles.toggleBtnActive]}
            onPress={() => handleViewType(tab.key)}
          >
            <Text style={[styles.toggleBtnText, viewType === tab.key && styles.toggleBtnTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.totalBar}>
        {viewType !== 'incomes' && (
          <View style={styles.totalChip}>
            <Ionicons name="arrow-down" size={12} color="#EF4444" />
            <Text style={[styles.totalChipText, { color: '#EF4444' }]}>{formatCurrency(totalExpenses)}</Text>
          </View>
        )}
        {viewType !== 'expenses' && (
          <View style={styles.totalChip}>
            <Ionicons name="arrow-up" size={12} color="#10B981" />
            <Text style={[styles.totalChipText, { color: '#10B981' }]}>{formatCurrency(totalIncomes)}</Text>
          </View>
        )}
        <Text style={styles.totalCount}>{filtered.length} movimientos</Text>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id + item.type}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyText}>Sin movimientos este mes</Text>
              <Text style={styles.emptySubtext}>Los gastos e ingresos apareceran aqui</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#1E293B' },

  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 20 },
  monthArrow: { padding: 8 },
  monthText: { fontSize: 17, fontWeight: '600', color: '#1E293B', minWidth: 160, textAlign: 'center' },

  toggleRow: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#3B82F6' },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  toggleBtnTextActive: { color: '#FFFFFF' },

  totalBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, gap: 12 },
  totalChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  totalChipText: { fontSize: 13, fontWeight: '700' },
  totalCount: { fontSize: 13, color: '#9CA3AF', marginLeft: 'auto' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardDesc: { fontSize: 15, fontWeight: '500', color: '#1E293B' },
  cardMeta: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  cardAmount: { fontSize: 15, fontWeight: '600' },
  cardCatLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
});
