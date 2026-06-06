import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router'; 
import { db } from '../../src/database/databaseInit';

const EMAIL_ADMIN = 'admin@instituicao.br';

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
      console.error("Erro ao buscar detalhes:", error);
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

    // 🛑 CORREÇÃO APLICADA AQUI: Retirado o item.id que estava causando o bug de sintaxe
    const diferencaEmHoras = calcularDiferencaHoras(item.data, item.horario_inicio);

    if (!ehAdmin && diferencaEmHoras < 3) {
      Alert.alert(
        'Cancelamento Bloqueado', 
        'Faltam menos de 3 horas para a reunião. Não é possível realizar o cancelamento.'
      );
      return;
    }

    Alert.alert(
      'Atenção',
      `Deseja realmente cancelar a reserva das ${item.horario_inicio}?`,
      [
        { text: 'Não', style: 'cancel' },
        { text: 'Sim, Cancelar', style: 'destructive', onPress: () => executarCancelamento(item.id) }
      ]
    );
  }

  function executarCancelamento(idAgendamento: number) {
    try {
      db.runSync('DELETE FROM agendamentos WHERE id = ?', [idAgendamento]);
      Alert.alert('Sucesso', 'Reserva cancelada com sucesso!');
      carregarDetalhes(); 
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível cancelar.');
    }
  }

  function tentarAlterar(item: Agendamento) {
    if (!usuarioAtual) return;

    const ehAdmin = usuarioAtual.email === EMAIL_ADMIN;
    const ehDonoDaReserva = usuarioAtual.id === item.id_usuario;

    if (!ehDonoDaReserva && !ehAdmin) {
      Alert.alert('Acesso Negado', 'Você só pode alterar as suas próprias reservas.');
      return;
    }

    const diferencaEmHoras = calcularDiferencaHoras(item.data, item.horario_inicio);

    if (!ehAdmin && diferencaEmHoras < 3) {
      Alert.alert(
        'Alteração Bloqueada', 
        'Faltam menos de 3 horas para o início do agendamento. Modificações de horário não são permitidas dentro dessa janela.'
      );
      return;
    }

    Alert.alert(
      'Alterar Horário',
      'Para alterar o horário mantendo a integridade da agenda, libere este espaço atual clicando em Cancelar e faça uma nova reserva.',
      [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Ir para Novo Agendamento', onPress: () => router.navigate('/agendamento') }
      ]
    );
  }

  const renderizarAgendamento = ({ item }: { item: Agendamento }) => {
    const [ano, mes, dia] = item.data.split('-');
    const dataFormatada = `${dia}/${mes}/${ano}`;

    const podeVerBotoes = usuarioAtual?.email === EMAIL_ADMIN || usuarioAtual?.id === item.id_usuario;

    return (
      <View style={styles.cardAgenda}>
        <View style={styles.dataContainer}>
          <Text style={styles.dataTexto}>📅 {dataFormatada}</Text>
          <Text style={styles.donoTexto}>👤 {item.nome_usuario}</Text>
        </View>
        <View style={styles.horaContainer}>
          <Text style={styles.horaTexto}>⏱️ {item.horario_inicio} até {item.horario_termino}</Text>
        </View>

        {podeVerBotoes && (
          <View style={styles.botoesAcao}>
            <TouchableOpacity style={styles.botaoAlterar} onPress={() => tentarAlterar(item)}>
              <Text style={styles.textoBotaoAcao}>Alterar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botaoCancelar} onPress={() => tentarCancelar(item)}>
              <Text style={styles.textoBotaoAcao}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.botaoVoltar} onPress={() => router.back()}>
        <Text style={styles.textoBotaoVoltar}>← Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Agenda: {nomeSala}</Text>

      {agenda.length === 0 ? (
        <View style={styles.vazioContainer}>
          <Text style={styles.vazioTexto}>Nenhum agendamento para esta sala.</Text>
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
  dataContainer: { borderBottomWidth: 1, borderBottomColor: '#F0F4F8', paddingBottom: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' },
  dataTexto: { fontSize: 16, fontWeight: 'bold', color: '#334E68' },
  donoTexto: { fontSize: 14, color: '#627D98', fontStyle: 'italic' },
  horaContainer: { marginBottom: 15 },
  horaTexto: { fontSize: 15, color: '#102A43', fontWeight: '500' },

  botoesAcao: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#F0F4F8', paddingTop: 10 },
  botaoAlterar: { backgroundColor: '#FFC107', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5, marginRight: 10 },
  botaoCancelar: { backgroundColor: '#DC3545', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5 },
  textoBotaoAcao: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },

  vazioContainer: { alignItems: 'center', marginTop: 50 },
  vazioTexto: { fontSize: 18, color: '#334E68', fontWeight: 'bold' }
});