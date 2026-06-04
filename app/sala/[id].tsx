import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
// useLocalSearchParams captura o ID da URL, e useRouter permite voltar
import { useLocalSearchParams, useRouter } from 'expo-router'; 
import { db } from '../../src/database/databaseInit';

// Tipagem do TypeScript
interface Agendamento {
  id: number;
  data: string;
  horario_inicio: string;
  horario_termino: string;
}

interface SalaDetalhe {
  nome_sala: string;
}

export default function DetalhesSalaScreen() {
  const { id } = useLocalSearchParams(); // Captura o ID da sala (ex: 1 ou 2)
  const router = useRouter();

  const [nomeSala, setNomeSala] = useState('');
  const [agenda, setAgenda] = useState<Agendamento[]>([]);

  useEffect(() => {
    carregarDetalhes();
  }, [id]);

  function carregarDetalhes() {
    try {
      // 1. Busca o nome da sala
      const sala = db.getFirstSync<SalaDetalhe>('SELECT nome_sala FROM salas WHERE id = ?', [Number(id)]);
      if (sala) setNomeSala(sala.nome_sala);

      // 2. Busca todos os agendamentos APENAS desta sala, ordenados por data e hora
      const agendamentos = db.getAllSync<Agendamento>(
        'SELECT * FROM agendamentos WHERE id_sala = ? ORDER BY data ASC, horario_inicio ASC', 
        [Number(id)]
      );
      setAgenda(agendamentos);
      
    } catch (error) {
      console.error("Erro ao buscar detalhes da sala:", error);
    }
  }

  // Componente visual de cada item da linha do tempo
  const renderizarAgendamento = ({ item }: { item: Agendamento }) => {
    // Formata a data (de YYYY-MM-DD para DD/MM/YYYY)
    const [ano, mes, dia] = item.data.split('-');
    const dataFormatada = `${dia}/${mes}/${ano}`;

    return (
      <View style={styles.cardAgenda}>
        <View style={styles.dataContainer}>
          <Text style={styles.dataTexto}>📅 {dataFormatada}</Text>
        </View>
        <View style={styles.horaContainer}>
          <Text style={styles.horaTexto}>⏱️ {item.horario_inicio} até {item.horario_termino}</Text>
          <Text style={styles.avisoTexto}>(Inclui tempo de organização)</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Botão de voltar nativo */}
      <TouchableOpacity style={styles.botaoVoltar} onPress={() => router.back()}>
        <Text style={styles.textoBotaoVoltar}>← Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Agenda da {nomeSala}</Text>

      {agenda.length === 0 ? (
        <View style={styles.vazioContainer}>
          <Text style={styles.vazioTexto}>Nenhum agendamento para esta sala.</Text>
          <Text style={styles.vazioSubTexto}>Ela está totalmente livre!</Text>
        </View>
      ) : (
        <FlatList 
          data={agenda}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderizarAgendamento}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8', padding: 20, paddingTop: 50 },
  botaoVoltar: { paddingVertical: 10, marginBottom: 10, alignSelf: 'flex-start' },
  textoBotaoVoltar: { fontSize: 16, color: '#007BFF', fontWeight: 'bold' },
  header: { fontSize: 22, fontWeight: 'bold', color: '#102A43', marginBottom: 20 },
  
  cardAgenda: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, borderLeftWidth: 5, borderLeftColor: '#007BFF', elevation: 2 },
  dataContainer: { borderBottomWidth: 1, borderBottomColor: '#F0F4F8', paddingBottom: 10, marginBottom: 10 },
  dataTexto: { fontSize: 16, fontWeight: 'bold', color: '#334E68' },
  horaContainer: {},
  horaTexto: { fontSize: 15, color: '#102A43', fontWeight: '500' },
  avisoTexto: { fontSize: 12, color: '#9FB3C8', marginTop: 4 },

  vazioContainer: { alignItems: 'center', marginTop: 50 },
  vazioTexto: { fontSize: 18, color: '#334E68', fontWeight: 'bold' },
  vazioSubTexto: { fontSize: 14, color: '#627D98', marginTop: 5 }
});