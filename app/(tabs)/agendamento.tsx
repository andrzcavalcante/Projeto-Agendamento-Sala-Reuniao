import { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, 
  Platform, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView 
} from 'react-native';
import { useRouter } from 'expo-router'; 
import { db } from '../../src/database/databaseInit';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';

export default function AgendamentoScreen() {
  const router = useRouter(); 

  const [idSala, setIdSala] = useState<string>('');
  const [duracaoHoras, setDuracaoHoras] = useState<string>('1'); 
  const [duracaoMinutos, setDuracaoMinutos] = useState<string>('0');

  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date());
  const [horaSelecionada, setHoraSelecionada] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [dataString, setDataString] = useState<string>('');
  const [horaString, setHoraString] = useState<string>('');

  const aoMudarData = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate && event.type !== 'dismissed') {
      setDataSelecionada(selectedDate);
      setDataString(selectedDate.toISOString().split('T')[0]);
    }
  };

  const aoMudarHora = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selectedDate && event.type !== 'dismissed') {
      setHoraSelecionada(selectedDate);
      const hh = String(selectedDate.getHours()).padStart(2, '0');
      const mm = String(selectedDate.getMinutes()).padStart(2, '0');
      setHoraString(`${hh}:${mm}`);
    }
  };

  async function agendarNotificacaoLocal(dataS: string, horaS: string, sala: string) {
    try {
      const [ano, mes, dia] = dataS.split('-').map(Number);
      const [hora, min] = horaS.split(':').map(Number);

      const dataReuniao = new Date(ano, mes - 1, dia, hora, min);

      const gatilhoNotificacao = new Date(dataReuniao.getTime() - (15 * 60 * 1000));
      const agora = new Date();

      if (gatilhoNotificacao <= agora) {
        return; 
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⏱️ Reunião se aproximando!",
          body: `Sua reserva na Sala ${sala} começa em 15 minutos.`,
          sound: true,
        },
        trigger: gatilhoNotificacao,
      });
      console.log(`🔔 Notificação agendada para: ${gatilhoNotificacao.toString()}`);
    } catch (error) {
      console.error("Erro ao agendar notificação:", error);
    }
  }

  function salvarAgendamento() {
    Keyboard.dismiss();

    if (!idSala || !dataString || !horaString) {
      Alert.alert('Erro', 'Preencha a sala, data e horário!');
      return;
    }

    try {
      const h = parseInt(duracaoHoras || '0');
      const m = parseInt(duracaoMinutos || '0');
      const tempoTotalMinutos = (h * 60) + m;

      if (tempoTotalMinutos <= 0) {
        Alert.alert('Erro', 'A duração deve ser maior que zero!');
        return;
      }

      const sessao = db.getFirstSync<{id_usuario: number}>('SELECT id_usuario FROM sessao LIMIT 1');
      if (!sessao) return router.replace('/login');

      const [hora, min] = horaString.split(':').map(Number);
      const fim = new Date();
      fim.setHours(hora, min + tempoTotalMinutos + 20);
      const horarioTerminoTotal = `${String(fim.getHours()).padStart(2, '0')}:${String(fim.getMinutes()).padStart(2, '0')}`;

      const conflito = db.getFirstSync<{id: number}>(
        `SELECT id FROM agendamentos WHERE id_sala = ? AND data = ? AND (horario_inicio < ? AND horario_termino > ?)`,
        [idSala, dataString, horarioTerminoTotal, horaString]
      );

      if (conflito) {
        Alert.alert('Conflito', 'Já existe uma reunião neste horário!');
        return;
      }

      db.runSync(
        'INSERT INTO agendamentos (id_usuario, id_sala, data, horario_inicio, horario_termino) VALUES (?, ?, ?, ?, ?)',
        [sessao.id_usuario, idSala, dataString, horaString, horarioTerminoTotal]
      );
      
      // Chame a função de agendamento aqui antes de fechar a tela
      agendarNotificacaoLocal(dataString, horaString, idSala);

      Alert.alert('Sucesso', 'Reserva confirmada!', [{ text: 'OK', onPress: () => router.navigate('/') }]);
    } catch (e) { console.error(e); }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.header}>Reservar Sala</Text>
        
        <View style={styles.card}>
          <Text style={styles.label}>Nº da Sala</Text>
          <TextInput style={styles.input} keyboardType="numeric" placeholder="Ex: 1" value={idSala} onChangeText={setIdSala} />

          <Text style={styles.label}>Data e Hora de Início</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.inputBotao, {flex: 1, marginRight: 10}]} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.textoBotaoFalso}>{dataString || '📅 Data'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.inputBotao, {flex: 1}]} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.textoBotaoFalso}>{horaString || '⏰ Hora'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Duração da Reunião</Text>
          <View style={styles.row}>
            <View style={styles.inputGrupo}>
              <TextInput style={styles.inputPequeno} keyboardType="numeric" value={duracaoHoras} onChangeText={setDuracaoHoras} maxLength={2} />
              <Text style={styles.legendaInput}>Horas</Text>
            </View>
            <View style={styles.inputGrupo}>
              <TextInput style={styles.inputPequeno} keyboardType="numeric" value={duracaoMinutos} onChangeText={setDuracaoMinutos} maxLength={2} />
              <Text style={styles.legendaInput}>Minutos</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.botaoPrincipal} onPress={salvarAgendamento}>
            <Text style={styles.textoBranco}>Confirmar Reserva</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && <DateTimePicker value={dataSelecionada} mode="date" onChange={aoMudarData} />}
        {showTimePicker && <DateTimePicker value={horaSelecionada} mode="time" is24Hour={true} onChange={aoMudarHora} />}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8', padding: 20, paddingTop: 60 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#102A43', marginBottom: 25 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, elevation: 4, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#334E68', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#F0F4F8', padding: 12, borderRadius: 10, fontSize: 16, color: '#102A43' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  inputBotao: { backgroundColor: '#F0F4F8', padding: 12, borderRadius: 10, alignItems: 'center' },
  textoBotaoFalso: { color: '#102A43', fontSize: 16 },
  inputGrupo: { flex: 1, alignItems: 'center', marginHorizontal: 5 },
  inputPequeno: { backgroundColor: '#F0F4F8', width: '100%', textAlign: 'center', padding: 12, borderRadius: 10, fontSize: 18, fontWeight: 'bold' },
  legendaInput: { fontSize: 12, color: '#627D98', marginTop: 5 },
  botaoPrincipal: { backgroundColor: '#007BFF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  textoBranco: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});