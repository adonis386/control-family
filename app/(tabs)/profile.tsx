import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getMonthlyBudget, setMonthlyBudget } from '@/services/budget';
import { getFixedExpenses, addFixedExpense, deleteFixedExpense } from '@/services/fixed-expenses';
import { getGoals, addGoal, contributeToGoal, deleteGoal } from '@/services/goals';
import { CATEGORIES, getCategoryById } from '@/constants/categories';
import { FixedExpense, Goal } from '@/types';

function formatCurrency(amount: number): string {
  return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const GOAL_ICONS = [
  { icon: 'airplane', color: '#3B82F6' },
  { icon: 'car', color: '#10B981' },
  { icon: 'home', color: '#F59E0B' },
  { icon: 'school', color: '#6366F1' },
  { icon: 'medkit', color: '#EF4444' },
  { icon: 'gift', color: '#EC4899' },
  { icon: 'shield-checkmark', color: '#8B5CF6' },
  { icon: 'phone-portrait', color: '#14B8A6' },
  { icon: 'flag', color: '#F97316' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { userData, logout } = useAuth();

  // Budget
  const [budget, setBudget] = useState('');
  const [currentBudget, setCurrentBudget] = useState(0);
  const [savingBudget, setSavingBudget] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);

  // Fixed Expenses
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [showAddFixed, setShowAddFixed] = useState(false);
  const [fixedName, setFixedName] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [fixedCategory, setFixedCategory] = useState('');
  const [fixedDay, setFixedDay] = useState('1');
  const [savingFixed, setSavingFixed] = useState(false);

  // Goals
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalIcon, setGoalIcon] = useState(GOAL_ICONS[0]);
  const [savingGoal, setSavingGoal] = useState(false);

  // Contribute modal
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  const loadAll = async () => {
    try {
      const [budgetAmt, fixed, goalsList] = await Promise.all([
        getMonthlyBudget(),
        getFixedExpenses(),
        getGoals(),
      ]);
      setCurrentBudget(budgetAmt);
      setBudget(budgetAmt > 0 ? budgetAmt.toString() : '');
      setFixedExpenses(fixed);
      setGoals(goalsList);
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  // Budget handlers
  const handleSaveBudget = async () => {
    const amount = parseFloat(budget);
    if (isNaN(amount) || amount < 0) { Alert.alert('Error', 'Ingresa un monto valido'); return; }
    setSavingBudget(true);
    try {
      await setMonthlyBudget(amount);
      setCurrentBudget(amount);
      setEditingBudget(false);
    } catch { Alert.alert('Error', 'No se pudo actualizar'); }
    finally { setSavingBudget(false); }
  };

  // Fixed Expense handlers
  const handleAddFixed = async () => {
    if (!fixedName.trim() || !fixedAmount.trim() || !fixedCategory) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    setSavingFixed(true);
    try {
      await addFixedExpense({
        name: fixedName.trim(),
        amount: parseFloat(fixedAmount),
        category: fixedCategory,
        dayOfMonth: parseInt(fixedDay) || 1,
        createdBy: userData?.uid || '',
      });
      setFixedName(''); setFixedAmount(''); setFixedCategory(''); setFixedDay('1');
      setShowAddFixed(false);
      loadAll();
    } catch { Alert.alert('Error', 'No se pudo agregar'); }
    finally { setSavingFixed(false); }
  };

  const handleDeleteFixed = (item: FixedExpense) => {
    Alert.alert('Eliminar', `Eliminar "${item.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteFixedExpense(item.id); loadAll(); } },
    ]);
  };

  // Goal handlers
  const handleAddGoal = async () => {
    if (!goalName.trim() || !goalTarget.trim()) {
      Alert.alert('Error', 'Ingresa nombre y monto objetivo');
      return;
    }
    setSavingGoal(true);
    try {
      await addGoal({
        name: goalName.trim(),
        targetAmount: parseFloat(goalTarget),
        savedAmount: 0,
        icon: goalIcon.icon,
        color: goalIcon.color,
        deadline: null,
        createdBy: userData?.uid || '',
      });
      setGoalName(''); setGoalTarget('');
      setShowAddGoal(false);
      loadAll();
    } catch { Alert.alert('Error', 'No se pudo agregar'); }
    finally { setSavingGoal(false); }
  };

  const handleContribute = async () => {
    const amt = parseFloat(contributeAmount);
    if (!contributeGoal || isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Ingresa un monto valido');
      return;
    }
    try {
      await contributeToGoal(contributeGoal.id, amt);
      setContributeGoal(null);
      setContributeAmount('');
      loadAll();
    } catch { Alert.alert('Error', 'No se pudo abonar'); }
  };

  const handleDeleteGoal = (item: Goal) => {
    Alert.alert('Eliminar Meta', `Eliminar "${item.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteGoal(item.id); loadAll(); } },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Cerrar Sesion', 'Estas seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const initials = (userData?.name || 'U').split(' ').map((w) => w.charAt(0)).join('').toUpperCase().slice(0, 2);
  const totalFixed = fixedExpenses.reduce((s, f) => s + f.amount, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}><Text style={styles.title}>Perfil</Text></View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        <Text style={styles.userName}>{userData?.name || 'Usuario'}</Text>
        <Text style={styles.userEmail}>{userData?.email || ''}</Text>
      </View>

      {/* ── Budget ── */}
      <View style={styles.section}>
        <SectionHeader icon="wallet-outline" color="#3B82F6" title="Presupuesto Mensual" />
        <View style={styles.card}>
          {!editingBudget ? (
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.smallLabel}>Presupuesto actual</Text>
                <Text style={styles.bigValue}>{currentBudget > 0 ? formatCurrency(currentBudget) : 'Sin definir'}</Text>
              </View>
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditingBudget(true)}>
                <Ionicons name="pencil" size={18} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              <View style={styles.inlineInput}>
                <Text style={styles.inlineCurrency}>$</Text>
                <TextInput style={styles.inlineField} value={budget} onChangeText={(t) => setBudget(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" autoFocus />
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditingBudget(false); setBudget(currentBudget > 0 ? currentBudget.toString() : ''); }}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBudget} disabled={savingBudget}>
                  {savingBudget ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ── Fixed Expenses ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <SectionHeader icon="repeat" color="#F59E0B" title="Gastos Fijos" />
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddFixed(!showAddFixed)}>
            <Ionicons name={showAddFixed ? 'close' : 'add'} size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {showAddFixed && (
          <View style={[styles.card, { marginBottom: 12 }]}>
            <TextInput style={styles.formInput} placeholder="Nombre (ej: Renta)" placeholderTextColor="#9CA3AF" value={fixedName} onChangeText={setFixedName} />
            <View style={styles.formRow}>
              <View style={[styles.inlineInput, { flex: 1 }]}>
                <Text style={styles.inlineCurrency}>$</Text>
                <TextInput style={styles.inlineField} placeholder="Monto" placeholderTextColor="#9CA3AF" value={fixedAmount} onChangeText={(t) => setFixedAmount(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
              </View>
              <View style={[styles.inlineInput, { width: 80 }]}>
                <Text style={{ fontSize: 13, color: '#9CA3AF', marginRight: 4 }}>Dia</Text>
                <TextInput style={[styles.inlineField, { textAlign: 'center' }]} value={fixedDay} onChangeText={(t) => setFixedDay(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={2} />
              </View>
            </View>
            <Text style={styles.miniLabel}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c.id} style={[styles.chipBtn, fixedCategory === c.id && { backgroundColor: c.color, borderColor: c.color }]} onPress={() => setFixedCategory(c.id)}>
                  <Ionicons name={c.icon as any} size={14} color={fixedCategory === c.id ? '#FFF' : c.color} />
                  <Text style={[styles.chipText, fixedCategory === c.id && { color: '#FFF' }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={handleAddFixed} disabled={savingFixed}>
              {savingFixed ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Agregar Gasto Fijo</Text>}
            </TouchableOpacity>
          </View>
        )}

        {fixedExpenses.length === 0 && !showAddFixed ? (
          <View style={styles.emptySmall}><Text style={styles.emptySmallText}>Sin gastos fijos configurados</Text></View>
        ) : (
          <View style={styles.card}>
            {fixedExpenses.map((fe, i) => {
              const cat = getCategoryById(fe.category);
              return (
                <TouchableOpacity key={fe.id} onLongPress={() => handleDeleteFixed(fe)} style={[styles.fixedRow, i < fixedExpenses.length - 1 && styles.borderBottom]}>
                  <View style={[styles.iconCircle, { backgroundColor: (cat?.color || '#6B7280') + '20' }]}>
                    <Ionicons name={(cat?.icon || 'ellipsis-horizontal-circle') as any} size={16} color={cat?.color || '#6B7280'} />
                  </View>
                  <Text style={styles.fixedName} numberOfLines={1}>{fe.name}</Text>
                  <Text style={styles.fixedAmt}>{formatCurrency(fe.amount)}</Text>
                </TouchableOpacity>
              );
            })}
            {fixedExpenses.length > 0 && (
              <View style={[styles.fixedRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB' }]}>
                <Text style={styles.totalLabel}>Total mensual</Text>
                <Text style={styles.totalValue}>{formatCurrency(totalFixed)}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── Goals ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <SectionHeader icon="flag" color="#8B5CF6" title="Metas de Ahorro" />
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#8B5CF6' }]} onPress={() => setShowAddGoal(!showAddGoal)}>
            <Ionicons name={showAddGoal ? 'close' : 'add'} size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {showAddGoal && (
          <View style={[styles.card, { marginBottom: 12 }]}>
            <TextInput style={styles.formInput} placeholder="Nombre (ej: Vacaciones)" placeholderTextColor="#9CA3AF" value={goalName} onChangeText={setGoalName} />
            <View style={[styles.inlineInput, { marginBottom: 12 }]}>
              <Text style={styles.inlineCurrency}>$</Text>
              <TextInput style={styles.inlineField} placeholder="Monto objetivo" placeholderTextColor="#9CA3AF" value={goalTarget} onChangeText={(t) => setGoalTarget(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
            </View>
            <Text style={styles.miniLabel}>Icono</Text>
            <View style={styles.iconGrid}>
              {GOAL_ICONS.map((gi, idx) => (
                <TouchableOpacity key={idx} style={[styles.iconPick, goalIcon.icon === gi.icon && { backgroundColor: gi.color, borderColor: gi.color }]} onPress={() => setGoalIcon(gi)}>
                  <Ionicons name={gi.icon as any} size={20} color={goalIcon.icon === gi.icon ? '#FFF' : gi.color} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#8B5CF6' }]} onPress={handleAddGoal} disabled={savingGoal}>
              {savingGoal ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Crear Meta</Text>}
            </TouchableOpacity>
          </View>
        )}

        {goals.length === 0 && !showAddGoal ? (
          <View style={styles.emptySmall}><Text style={styles.emptySmallText}>Sin metas configuradas</Text></View>
        ) : (
          goals.map((g) => {
            const progress = g.targetAmount > 0 ? Math.min(g.savedAmount / g.targetAmount, 1) : 0;
            return (
              <View key={g.id} style={[styles.card, { marginBottom: 10, borderLeftWidth: 4, borderLeftColor: g.color || '#8B5CF6' }]}>
                <View style={styles.rowBetween}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name={(g.icon || 'flag') as any} size={20} color={g.color || '#8B5CF6'} />
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B' }} numberOfLines={1}>{g.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteGoal(g)}><Ionicons name="trash-outline" size={18} color="#D1D5DB" /></TouchableOpacity>
                </View>
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>
                  {formatCurrency(g.savedAmount)} de {formatCurrency(g.targetAmount)} ({Math.round(progress * 100)}%)
                </Text>
                <View style={styles.goalBarBg}>
                  <View style={[styles.goalBarFill, { width: `${progress * 100}%`, backgroundColor: g.color || '#8B5CF6' }]} />
                </View>
                <TouchableOpacity style={[styles.contributeBtn, { borderColor: g.color || '#8B5CF6' }]} onPress={() => { setContributeGoal(g); setContributeAmount(''); }}>
                  <Ionicons name="add-circle-outline" size={16} color={g.color || '#8B5CF6'} />
                  <Text style={[styles.contributeBtnText, { color: g.color || '#8B5CF6' }]}>Abonar</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      {/* ── Logout ── */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#EF4444" />
        <Text style={styles.logoutText}>Cerrar Sesion</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />

      {/* Contribute Modal */}
      <Modal visible={!!contributeGoal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Abonar a "{contributeGoal?.name}"</Text>
            <View style={[styles.inlineInput, { marginVertical: 16 }]}>
              <Text style={styles.inlineCurrency}>$</Text>
              <TextInput style={styles.inlineField} placeholder="Monto" placeholderTextColor="#9CA3AF" value={contributeAmount} onChangeText={(t) => setContributeAmount(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" autoFocus />
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setContributeGoal(null)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: contributeGoal?.color || '#8B5CF6' }]} onPress={handleContribute}>
                <Text style={styles.saveBtnText}>Abonar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SectionHeader({ icon, color, title }: { icon: string; color: string; title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: color + '15', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '600', color: '#1E293B' }}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#1E293B' },
  profileCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { color: '#FFF', fontSize: 28, fontWeight: '700' },
  userName: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  userEmail: { fontSize: 15, color: '#64748B' },

  section: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  smallLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 4 },
  bigValue: { fontSize: 24, fontWeight: '700', color: '#1E293B' },
  editBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center' },

  inlineInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, height: 50, borderWidth: 1.5, borderColor: '#E5E7EB' },
  inlineCurrency: { fontSize: 18, fontWeight: '600', color: '#64748B', marginRight: 8 },
  inlineField: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1E293B' },

  actionRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  saveBtn: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#3B82F6' },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },

  formInput: { backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 16, color: '#1E293B', borderWidth: 1.5, borderColor: '#E5E7EB', marginBottom: 12 },
  formRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  miniLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 },

  chipBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E5E7EB', marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '500', color: '#6B7280' },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  iconPick: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },

  fixedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  iconCircle: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  fixedName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1E293B' },
  fixedAmt: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  totalLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#64748B' },
  totalValue: { fontSize: 15, fontWeight: '700', color: '#1E293B' },

  goalBarBg: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  goalBarFill: { height: '100%', borderRadius: 4 },
  contributeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  contributeBtnText: { fontSize: 14, fontWeight: '600' },

  emptySmall: { backgroundColor: '#FFF', borderRadius: 14, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  emptySmallText: { fontSize: 14, color: '#9CA3AF' },

  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FEF2F2', borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: '#FECACA' },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
});
