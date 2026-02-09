import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { addExpense } from '@/services/expenses';
import { addIncome } from '@/services/income';
import { CATEGORIES } from '@/constants/categories';
import { INCOME_SOURCES } from '@/constants/income-sources';

type TransactionType = 'expense' | 'income';

export default function AddExpenseScreen() {
  const insets = useSafeAreaInsets();
  const { user, userData } = useAuth();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const isExpense = type === 'expense';
  const categories = isExpense ? CATEGORIES : INCOME_SOURCES;
  const accentColor = isExpense ? '#EF4444' : '#10B981';

  const handleSubmit = async () => {
    if (!amount.trim() || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Ingresa un monto valido');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Ingresa una descripcion');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Error', isExpense ? 'Selecciona una categoria' : 'Selecciona una fuente');
      return;
    }

    setLoading(true);
    try {
      if (isExpense) {
        await addExpense({
          amount: parseFloat(amount),
          description: description.trim(),
          category: selectedCategory,
          userId: user?.uid || '',
          userName: userData?.name || 'Usuario',
          date: new Date(),
        });
      } else {
        await addIncome({
          amount: parseFloat(amount),
          description: description.trim(),
          source: selectedCategory,
          userId: user?.uid || '',
          userName: userData?.name || 'Usuario',
          date: new Date(),
        });
      }

      const label = isExpense ? 'Gasto' : 'Ingreso';
      Alert.alert('Listo', `${label} registrado correctamente`, [
        {
          text: 'OK',
          onPress: () => {
            setAmount('');
            setDescription('');
            setSelectedCategory('');
          },
        },
      ]);
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Error', `No se pudo registrar el ${isExpense ? 'gasto' : 'ingreso'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeSwitch = (newType: TransactionType) => {
    if (newType !== type) {
      setType(newType);
      setSelectedCategory('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Nuevo Registro</Text>
          <Text style={styles.subtitle}>Registra un gasto o ingreso</Text>
        </View>

        {/* Type Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, isExpense && styles.toggleExpenseActive]}
            onPress={() => handleTypeSwitch('expense')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-down-circle"
              size={20}
              color={isExpense ? '#FFFFFF' : '#EF4444'}
            />
            <Text style={[styles.toggleText, isExpense && styles.toggleTextActive]}>
              Gasto
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, !isExpense && styles.toggleIncomeActive]}
            onPress={() => handleTypeSwitch('income')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-up-circle"
              size={20}
              color={!isExpense ? '#FFFFFF' : '#10B981'}
            />
            <Text style={[styles.toggleText, !isExpense && styles.toggleTextActive]}>
              Ingreso
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View style={[styles.amountContainer, { borderColor: accentColor + '30' }]}>
          <Text style={[styles.currencySign, { color: accentColor }]}>$</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor="#94A3B8"
            value={amount}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9.]/g, '');
              const parts = cleaned.split('.');
              if (parts.length <= 2) {
                if (parts[1] && parts[1].length > 2) return;
                setAmount(cleaned);
              }
            }}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Descripcion</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="create-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={isExpense ? 'Ej: Compras del supermercado' : 'Ej: Sueldo de enero'}
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              maxLength={100}
            />
          </View>
        </View>

        {/* Category / Source Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>{isExpense ? 'Categoria' : 'Fuente de ingreso'}</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => {
              const isSelected = selectedCategory === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    isSelected && { backgroundColor: category.color + '20', borderColor: category.color },
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.categoryIconContainer,
                      { backgroundColor: isSelected ? category.color : category.color + '15' },
                    ]}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={22}
                      color={isSelected ? '#FFFFFF' : category.color}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryText,
                      isSelected && { color: category.color, fontWeight: '600' },
                    ]}
                    numberOfLines={1}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Date Display */}
        <View style={styles.section}>
          <Text style={styles.label}>Fecha</Text>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: accentColor },
            loading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                Registrar {isExpense ? 'Gasto' : 'Ingreso'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 13,
    gap: 8,
  },
  toggleExpenseActive: {
    backgroundColor: '#EF4444',
  },
  toggleIncomeActive: {
    backgroundColor: '#10B981',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  currencySign: {
    fontSize: 40,
    fontWeight: '300',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1E293B',
    minWidth: 120,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryItem: {
    width: '31%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dateText: {
    fontSize: 15,
    color: '#374151',
    textTransform: 'capitalize',
  },
  submitButton: {
    flexDirection: 'row',
    borderRadius: 16,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
