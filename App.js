import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@financas_despesas';

export default function App() {
  const [despesas, setDespesas] = useState([]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');

  // Carregar dados salvos ao iniciar
  useEffect(() => {
    carregarDespesas();
  }, []);

  // Salvar sempre que a lista de despesas mudar
  useEffect(() => {
    salvarDespesas(despesas);
  }, [despesas]);

  const carregarDespesas = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (jsonValue != null) {
        setDespesas(JSON.parse(jsonValue));
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar as despesas.');
    }
  };

  const salvarDespesas = async (value) => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar os dados.');
    }
  };

  const adicionarDespesa = () => {
    if (!descricao.trim() || !valor.trim()) {
      Alert.alert('Atenção', 'Preencha a descrição e o valor.');
      return;
    }

    const valorNumerico = parseFloat(valor.replace(',', '.'));
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      Alert.alert('Atenção', 'Insira um valor numérico válido.');
      return;
    }

    const novaDespesa = {
      id: Date.now().toString(),
      descricao,
      valor: valorNumerico,
    };

    setDespesas([novaDespesa, ...despesas]);
    setDescricao('');
    setValor('');
  };

  const removerDespesa = (id) => {
    setDespesas(despesas.filter((item) => item.id !== id));
  };

  const calcularTotal = () => {
    return despesas.reduce((acc, curr) => acc + curr.valor, 0).toFixed(2);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <Text style={styles.titulo}>Minhas Finanças</Text>

      {/* Cartão do Total */}
      <View style={styles.cardTotal}>
        <Text style={styles.labelTotal}>Total Gasto</Text>
        <Text style={styles.valorTotal}>R$ {calcularTotal()}</Text>
      </View>

      {/* Formulário de Adição */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Descrição (ex: Mercado)"
          value={descricao}
          onChangeText={setDescricao}
        />
        <TextInput
          style={styles.input}
          placeholder="Valor (R$)"
          keyboardType="numeric"
          value={valor}
          onChangeText={setValor}
        />
        <TouchableOpacity style={styles.botao} onPress={adicionarDespesa}>
          <Text style={styles.textoBotao}>Adicionar Despesa</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Despesas */}
      <FlatList
        data={despesas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View>
              <Text style={styles.itemDescricao}>{item.descricao}</Text>
              <Text style={styles.itemValor}>R$ {item.valor.toFixed(2)}</Text>
            </View>
            <TouchableOpacity onPress={() => removerDespesa(item.id)}>
              <Text style={styles.deletarText}>Excluir</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.vazioText}>Nenhuma despesa cadastrada.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  cardTotal: {
    backgroundColor: '#2E7D32',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  labelTotal: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
  },
  valorTotal: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 5,
  },
  form: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  botao: {
    backgroundColor: '#1976D2',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoBotao: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  itemDescricao: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemValor: {
    fontSize: 14,
    color: '#E53935',
    marginTop: 2,
  },
  deletarText: {
    color: '#E53935',
    fontWeight: 'bold',
  },
  vazioText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
  },
});