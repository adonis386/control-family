import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { getMonthlyExpenses } from '@/services/expenses';
import { getMonthlyIncomes } from '@/services/income';
import { getCategoryById, CATEGORIES } from '@/constants/categories';
import { Expense, Income } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatCurrency(amount: number): string {
  return '$' + amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

interface MonthData {
  expenses: number;
  incomes: number;
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyExpenses, setMonthlyExpenses] = useState<Expense[]>([]);
  const [monthlyIncomes, setMonthlyIncomes] = useState<Income[]>([]);
  const [historicalData, setHistoricalData] = useState<MonthData[]>([]);
  const [historicalLabels, setHistoricalLabels] = useState<string[]>([]);
  const [prevMonthTotal, setPrevMonthTotal] = useState(0);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const loadData = useCallback(async () => {
    try {
      // Current month data
      const [expenses, incomes] = await Promise.all([
        getMonthlyExpenses(currentYear, currentMonth),
        getMonthlyIncomes(currentYear, currentMonth),
      ]);
      setMonthlyExpenses(expenses);
      setMonthlyIncomes(incomes);

      // Historical data: last 6 months
      const months: MonthData[] = [];
      const labels: string[] = [];

      const promises = [];
      for (let i = 5; i >= 0; i--) {
        let m = currentMonth - i;
        let y = currentYear;
        if (m < 0) { m += 12; y -= 1; }
        labels.push(MONTHS_SHORT[m]);
        promises.push(
          Promise.all([
            getMonthlyExpenses(y, m),
            getMonthlyIncomes(y, m),
          ])
        );
      }

      const results = await Promise.all(promises);
      results.forEach(([exp, inc]) => {
        months.push({
          expenses: exp.reduce((s: number, e: Expense) => s + e.amount, 0),
          incomes: inc.reduce((s: number, i: Income) => s + i.amount, 0),
        });
      });

      setHistoricalData(months);
      setHistoricalLabels(labels);

      // Previous month total for comparison
      let prevM = currentMonth - 1;
      let prevY = currentYear;
      if (prevM < 0) { prevM = 11; prevY -= 1; }
      const prevExpenses = await getMonthlyExpenses(prevY, prevM);
      setPrevMonthTotal(prevExpenses.reduce((s, e) => s + e.amount, 0));
    } catch (error) {
      console.error('Error loading stats:', error);
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

  const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = monthlyIncomes.reduce((sum, i) => sum + i.amount, 0);

  // Category breakdown for pie chart
  const categoryTotals = monthlyExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([catId, amount]) => {
      const cat = getCategoryById(catId);
      return {
        name: cat?.name || catId,
        amount,
        color: cat?.color || '#6B7280',
        legendFontColor: '#64748B',
        legendFontSize: 12,
      };
    });

  // Month comparison
  const monthChange = prevMonthTotal > 0
    ? ((totalSpent - prevMonthTotal) / prevMonthTotal) * 100
    : 0;

  // Bar chart data
  const barData = {
    labels: historicalLabels,
    datasets: [
      { data: historicalData.map((d) => d.expenses || 0), color: () => '#EF4444' },
      { data: historicalData.map((d) => d.incomes || 0), color: () => '#10B981' },
    ],
    legend: ['Gastos', 'Ingresos'],
  };

  // Top spenders
  const spenderTotals = monthlyExpenses.reduce((acc, e) => {
    acc[e.userName] = (acc[e.userName] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);
  const sortedSpenders = Object.entries(spenderTotals).sort(([, a], [, b]) => b - a);

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Estadisticas</Text>
        <Text style={styles.month}>{MONTHS[currentMonth]} {currentYear}</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: '#EF4444' }]}>
          <Text style={styles.summaryLabel}>Gastos</Text>
          <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{formatCurrency(totalSpent)}</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: '#10B981' }]}>
          <Text style={styles.summaryLabel}>Ingresos</Text>
          <Text style={[styles.summaryValue, { color: '#10B981' }]}>{formatCurrency(totalIncome)}</Text>
        </View>
      </View>

      {/* Month Comparison */}
      <View style={styles.comparisonCard}>
        <Ionicons
          name={monthChange <= 0 ? 'trending-down' : 'trending-up'}
          size={28}
          color={monthChange <= 0 ? '#10B981' : '#EF4444'}
        />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.comparisonTitle}>vs. mes anterior</Text>
          <Text style={styles.comparisonText}>
            {prevMonthTotal === 0
              ? 'Sin datos del mes anterior'
              : monthChange <= 0
                ? `Gastaste ${Math.abs(monthChange).toFixed(0)}% menos`
                : `Gastaste ${monthChange.toFixed(0)}% mas`}
          </Text>
        </View>
        {prevMonthTotal > 0 && (
          <View style={[styles.changeBadge, { backgroundColor: monthChange <= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
            <Text style={[styles.changeBadgeText, { color: monthChange <= 0 ? '#059669' : '#DC2626' }]}>
              {monthChange <= 0 ? '' : '+'}{monthChange.toFixed(0)}%
            </Text>
          </View>
        )}
      </View>

      {/* Pie Chart - Gastos por Categoria */}
      {pieData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gastos por Categoria</Text>
          <View style={styles.chartCard}>
            <PieChart
              data={pieData}
              width={SCREEN_WIDTH - 80}
              height={200}
              chartConfig={{
                color: () => '#1E293B',
                labelColor: () => '#64748B',
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="8"
              absolute={false}
            />
          </View>
        </View>
      )}

      {/* Bar Chart - Historico */}
      {historicalData.length > 0 && historicalData.some((d) => d.expenses > 0 || d.incomes > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ultimos 6 Meses</Text>
          <View style={styles.chartCard}>
            <BarChart
              data={barData}
              width={SCREEN_WIDTH - 80}
              height={220}
              yAxisLabel="$"
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: '#FFFFFF',
                backgroundGradientFrom: '#FFFFFF',
                backgroundGradientTo: '#FFFFFF',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                labelColor: () => '#64748B',
                barPercentage: 0.5,
                propsForBackgroundLines: {
                  strokeDasharray: '',
                  stroke: '#F3F4F6',
                },
              }}
              fromZero
              showBarTops={false}
              style={{ borderRadius: 12 }}
            />
          </View>
        </View>
      )}

      {/* Top Spenders */}
      {sortedSpenders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gasto por Miembro</Text>
          <View style={styles.chartCard}>
            {sortedSpenders.map(([name, amount], index) => {
              const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
              const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];
              const color = colors[index % colors.length];
              return (
                <View key={name} style={[styles.spenderRow, index < sortedSpenders.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }]}>
                  <View style={[styles.spenderAvatar, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.spenderInitial, { color }]}>{name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.spenderInfo}>
                    <Text style={styles.spenderName}>{name}</Text>
                    <View style={styles.spenderBarBg}>
                      <View style={[styles.spenderBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.spenderAmount}>{formatCurrency(amount)}</Text>
                    <Text style={styles.spenderPercent}>{percentage.toFixed(0)}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Empty state */}
      {monthlyExpenses.length === 0 && monthlyIncomes.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="analytics-outline" size={56} color="#D1D5DB" />
          <Text style={styles.emptyText}>Sin datos este mes</Text>
          <Text style={styles.emptySubtext}>Registra gastos e ingresos para ver estadisticas</Text>
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F8' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#1E293B' },
  month: { fontSize: 14, color: '#64748B', fontWeight: '500' },

  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  summaryLabel: { fontSize: 13, color: '#64748B', marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: '700' },

  comparisonCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  comparisonTitle: { fontSize: 13, color: '#9CA3AF' },
  comparisonText: { fontSize: 15, fontWeight: '600', color: '#1E293B', marginTop: 2 },
  changeBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  changeBadgeText: { fontSize: 14, fontWeight: '700' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  chartCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },

  spenderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  spenderAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  spenderInitial: { fontSize: 18, fontWeight: '700' },
  spenderInfo: { flex: 1, marginRight: 12 },
  spenderName: { fontSize: 15, fontWeight: '500', color: '#1E293B', marginBottom: 6 },
  spenderBarBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  spenderBarFill: { height: '100%', borderRadius: 3 },
  spenderAmount: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  spenderPercent: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  emptyCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 48, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
});
