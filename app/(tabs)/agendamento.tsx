import { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, 
  Platform, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView 
} from 'react-native';
import { useRouter } from 'expo-router'; 
import { db } from '../../src/database/databaseInit';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AgendamentoScreen() {
  const router = useRouter(); 

  const [idSala, setIdSala] = useState<string>('');
  const [duracao, setDuracao] = useState<string>('');

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
      const formatada = selectedDate.toISOString().split('T')[0];
      setDataString(formatada);
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

  function calcularHorarioTermino(horaBase: string, minutosAdicionais: number) {
    const [hora, minuto] = horaBase.split(':').map(Number);
    const tempo = new Date();
    tempo.setHours(hora, minuto, 0, 0);
    tempo.setMinutes(tempo.getMinutes() + minutosAdicionais);
    const hh = String(tempo.getHours()).padStart(2, '0');
    const mm = String(tempo.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  function salvarAgendamento() {
    Keyboard.dismiss();

    if (!idSala || !dataString || !horaString || !duracao) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos!');
      return;
    }

    try {
      const salaID = parseInt(idSala);
      const salaExiste = db.getFirstSync<{id: number}>('SELECT id FROM salas WHERE id = ?', [salaID]);
      
      if (!salaExiste) {
        Alert.alert('Erro', `A sala com ID ${salaID} não existe.`);
        return; 
      }

      const sessao = db.getFirstSync<{id_usuario: number}>('SELECT id_usuario FROM sessao LIMIT 1');
      if (!sessao) {
        Alert.alert('Sessão Expirada', 'Por favor, faça login novamente.');
        router.replace('/login');
        return;
      }

      const tempoReuniao = parseInt(duracao);
      const tempoOrganizacao = 20; 
      const horarioTerminoTotal = calcularHorarioTermino(horaString, tempoReuniao + tempoOrganizacao);

      // 🛑 NOVA TRAVA: CHECAGEM DE CONFLITO DE HORÁRIOS (DOUBLE BOOKING)
      // A lógica: Um horário cruza com outro se o "Início A" for MENOR que o "Término B" 
      // E o "Término A" for MAIOR que o "Início B".
      const conflito = db.getFirstSync<{id: number}>(
        `SELECT id FROM agendamentos 
         WHERE id_sala = ? AND data = ? 
         AND (horario_inicio < ? AND horario_termino > ?)`,
        [salaID, dataString, horarioTerminoTotal, horaString]
      );

      if (conflito) {
        Alert.alert(
          'Horário Indisponível', 
          'Já existe uma reserva que entra em conflito com este horário nesta sala. Verifique a agenda.'
        );
        return;
      }
      // -------------------------------------------------------------

      db.runSync(
        'INSERT INTO agendamentos (id_usuario, id_sala, data, horario_inicio, horario_termino) VALUES (?, ?, ?, ?, ?)',
        [sessao.id_usuario, salaID, dataString, horaString, horarioTerminoTotal]
      );
      
      setIdSala(''); setDuracao(''); setDataString(''); setHoraString('');

      Alert.alert(
        'Sucesso', 
        `Reunião salva.\nBloqueio até ${horarioTerminoTotal} (inclui 20min de organização).`, 
        [{ text: 'OK', onPress: () => router.navigate('/') }]
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível salvar o agendamento.');
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView style={styles.flexContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <Text style={styles.header}>Novo Agendamento</Text>
          
          <Text style={styles.label}>ID da Sala (Ex: 1 ou 2)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={idSala} onChangeText={setIdSala} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />

          <Text style={styles.label}>Data da Reunião</Text>
          <TouchableOpacity style={styles.inputBotao} onPress={() => { Keyboard.dismiss(); setShowDatePicker(true); }}>
            <Text style={dataString ? styles.textoPreenchido : styles.textoPlaceholder}>
              {dataString ? dataString : '📅 Toque para escolher a data'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && <DateTimePicker value={dataSelecionada} mode="date" display="default" onChange={aoMudarData} />}

          <View style={styles.row}>
            <View style={styles.coluna}>
              <Text style={styles.label}>Início</Text>
              <TouchableOpacity style={styles.inputBotao} onPress={() => { Keyboard.dismiss(); setShowTimePicker(true); }}>
                <Text style={horaString ? styles.textoPreenchido : styles.textoPlaceholder}>{horaString ? horaString : '⏰ Escolher'}</Text>
              </TouchableOpacity>
              {showTimePicker && <DateTimePicker value={horaSelecionada} mode="time" is24Hour={true} display="default" onChange={aoMudarHora} />}
            </View>

            <View style={styles.coluna}>
              <Text style={styles.label}>Duração (Min)</Text>
              <TextInput style={styles.input} placeholder="Ex: 60" keyboardType="numeric" value={duracao} onChangeText={setDuracao} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
            </View>
          </View>

          <TouchableOpacity style={styles.botao} onPress={salvarAgendamento}>
            <Text style={styles.textoBotao}>Confirmar Agendamento</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  flexContainer: { flex: 1, backgroundColor: '#F0F4F8' },
  container: { flex: 1, padding: 20, paddingTop: 50 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#102A43' },
  label: { fontSize: 16, color: '#334E68', marginBottom: 5, fontWeight: '600' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D9E2EC', padding: 12, borderRadius: 8, marginBottom: 15 },
  inputBotao: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D9E2EC', padding: 15, borderRadius: 8, marginBottom: 15, justifyContent: 'center' },
  textoPlaceholder: { color: '#9FB3C8', fontSize: 16 },
  textoPreenchido: { color: '#334E68', fontSize: 16, fontWeight: '500' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  coluna: { width: '48%' }, 
  botao: { backgroundColor: '#007BFF', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  textoBotao: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});