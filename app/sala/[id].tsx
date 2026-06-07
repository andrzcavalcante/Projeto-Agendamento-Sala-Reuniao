import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router'; 
import { db } from '../../src/database/databaseInit';

const EMAIL_ADMIN = 'admin@instituicao.br';

const ANTECEDENCIA_MINIMA_HORAS = 1; 

interface UsuarioAtual {
  id: number;
  email: string;
}

interface Agendamento {
  id: number;
  id_usuario: number;
  nome_usuario: string; 
  data: string;
  horario_inicio: string;
  horario_termino: string;
}

export default function DetalhesSalaScreen() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();

  const [nomeSala, setNomeSala] = useState('');
  const [agenda, setAgenda] = useState<Agendamento[]>([]);
  const [usuarioAtual, setUsuarioAtual] = useState<UsuarioAtual | null>(null);

  useEffect(() => {
    carregarDetalhes();
  }, [id]);

  function carregarDetalhes() {
    try {
      const sessao = db.getFirstSync<{id_usuario: number}>('SELECT id_usuario FROM sessao LIMIT 1');
      if (sessao) {
        const user = db.getFirstSync<UsuarioAtual>('SELECT id, email FROM usuarios WHERE id = ?', [sessao.id_usuario]);
        setUsuarioAtual(user);
      }

      const sala = db.getFirstSync<{nome_sala: string}>('SELECT nome_sala FROM salas WHERE id = ?', [Number(id)]);
      if (sala) setNomeSala(sala.nome_sala);

      const query = `
        SELECT a.id, a.id_usuario, a.data, a.horario_inicio, a.horario_termino, u.nome as nome_usuario 
        FROM agendamentos a 
        JOIN usuarios u ON a.id_usuario = u.id 
        WHERE a.id_sala = ? 
        ORDER BY a.data ASC, a.horario_inicio ASC
      `;
      const agendamentos = db.getAllSync<Agendamento>(query, [Number(id)]);
      setAgenda(agendamentos);
      
    } catch (error) {
      console.error("Erro ao carregar agenda:", error);
    }
  }

  function calcularDiferencaHoras(dataAgendamento: string, horaInicio: string): number {
    const [ano, mes, dia] = dataAgendamento.split('-').map(Number);
    const [hora, minuto] = horaInicio.split(':').map(Number);
    
    const dataReserva = new Date(ano, mes - 1, dia, hora, minuto);
    const agora = new Date();

    return (dataReserva.getTime() - agora.getTime()) / (1000 * 60 * 60);
  }

  function tentarCancelar(item: Agendamento) {
    if (!usuarioAtual) return;

    const ehAdmin = usuarioAtual.email === EMAIL_ADMIN;
    const ehDonoDaReserva = usuarioAtual.id === item.id_usuario;

    if (!ehDonoDaReserva && !ehAdmin) {
      Alert.alert('Acesso Negado', 'Você só pode cancelar as suas próprias reservas.');
      return;
    }

    const diferencaEmHoras = calcularDiferencaHoras(item.data, item.horario_inicio);

    if (!ehAdmin && diferencaEmHoras < ANTECEDENCIA_MINIMA_HORAS) {
      Alert.alert(
        'Cancelamento Bloqueado', 
        `Falta menos de ${ANTECEDENCIA_MINIMA_HORAS} hora para a reunião. Alterações não são permitidas.`
      );
      return;
    }

    Alert.alert(
      'Confirmar Cancelamento',
      `Deseja realmente liberar a sala no dia ${item.data} às ${item.horario_inicio}?`,
      [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Sim, Cancelar', style: 'destructive', onPress: () => executarCancelamento(item.id) }
      ]
    );
  }

  function executarCancelamento(idAgendamento: number) {
    try {
      db.runSync('DELETE FROM agendamentos WHERE id = ?', [idAgendamento]);
      Alert.alert('Sucesso', 'Reserva removida da agenda.');
      carregarDetalhes(); 
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível processar o cancelamento.');
    }
  }

  function tentarAlterar(item: Agendamento) {
    const diferencaEmHoras = calcularDiferencaHoras(item.data, item.horario_inicio);
    const ehAdmin = usuarioAtual?.email === EMAIL_ADMIN;

    if (!ehAdmin && diferencaEmHoras < ANTECEDENCIA_MINIMA_HORAS) {
      Alert.alert('Bloqueado', `Modificações só podem ser feitas com ${ANTECEDENCIA_MINIMA_HORAS}h de antecedência.`);
      return;
    }

    Alert.alert(
      'Ajustar Reserva',
      'Para garantir que não haja choque de horários, cancele esta reserva e crie uma nova com o horário desejado.',
      [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Ir para Novo Agendamento', onPress: () => router.navigate('/agendamento') }
      ]
    );
  }

  const renderizarItem = ({ item }: { item: Agendamento }) => {
    const [ano, mes, dia] = item.data.split('-');
    const dataFormatada = `${dia}/${mes}/${ano}`;
    const podeEditar = usuarioAtual?.email === EMAIL_ADMIN || usuarioAtual?.id === item.id_usuario;

    return (
      <View style={styles.card}>
        <View style={styles.headerCard}>
          <Text style={styles.dataTexto}>📅 {dataFormatada}</Text>
          <Text style={styles.usuarioTexto}>👤 {item.nome_usuario}</Text>
        </View>

        <Text style={styles.horarioTexto}>
          🕒 {item.horario_inicio} — {item.horario_termino}
        </Text>

        {podeEditar && (
          <View style={styles.containerBotoes}>
            <TouchableOpacity style={styles.btnAlterar} onPress={() => tentarAlterar(item)}>
              <Text style={styles.btnTexto}>Alterar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancelar} onPress={() => tentarCancelar(item)}>
              <Text style={styles.btnTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topo}>
        <Text style={styles.subTitulo}>Histórico e Próximas Reuniões</Text>
        <Text style={styles.tituloSala}>{nomeSala}</Text>
      </View>

      {agenda.length === 0 ? (
        <View style={styles.vazio}>
          <Text style={styles.vazioTexto}>Nenhuma reserva encontrada para esta sala.</Text>
        </View>
      ) : (
        <FlatList 
          data={agenda}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderizarItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8', paddingHorizontal: 20 },
  topo: { marginTop: 20, marginBottom: 20 },
  subTitulo: { fontSize: 14, color: '#627D98', textTransform: 'uppercase', fontWeight: 'bold' },
  tituloSala: { fontSize: 26, fontWeight: 'bold', color: '#102A43' },
  
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 15, 
    elevation: 3, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4,
    borderLeftWidth: 6,
    borderLeftColor: '#007BFF'
  },
  headerCard: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  dataTexto: { fontSize: 16, fontWeight: 'bold', color: '#334E68' },
  usuarioTexto: { fontSize: 14, color: '#627D98', fontStyle: 'italic' },
  horarioTexto: { fontSize: 17, color: '#102A43', fontWeight: '600', marginBottom: 15 },
  
  containerBotoes: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, borderTopWidth: 1, borderTopColor: '#F0F4F8', paddingTop: 12 },
  btnAlterar: { backgroundColor: '#FFC107', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  btnCancelar: { backgroundColor: '#DC3545', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  btnTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  vazio: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  vazioTexto: { fontSize: 16, color: '#486581', textAlign: 'center' }
});