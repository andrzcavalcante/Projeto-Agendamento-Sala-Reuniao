import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router'; 
import { db } from '../../src/database/databaseInit';
// 1. Importação da nova biblioteca
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AgendamentoScreen() {
  const router = useRouter(); 

  const [idSala, setIdSala] = useState<string>('');
  const [duracao, setDuracao] = useState<string>('');

  // 2. Estados para gerenciar as datas reais e a exibição dos pop-ups
  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date());
  const [horaSelecionada, setHoraSelecionada] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Strings formatadas para exibir na tela e salvar no banco
  const [dataString, setDataString] = useState<string>('');
  const [horaString, setHoraString] = useState<string>('');

  // 3. Funções que lidam com a escolha no Pop-up
  const aoMudarData = (event: any, selectedDate?: Date) => {
    // No Android, precisamos fechar o modal manualmente após a escolha
    if (Platform.OS === 'android') setShowDatePicker(false);
    
    if (selectedDate && event.type !== 'dismissed') {
      setDataSelecionada(selectedDate);
      // Formata para YYYY-MM-DD
      const formatada = selectedDate.toISOString().split('T')[0];
      setDataString(formatada);
    }
  };

  const aoMudarHora = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    
    if (selectedDate && event.type !== 'dismissed') {
      setHoraSelecionada(selectedDate);
      // Formata para HH:mm
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

      const tempoReuniao = parseInt(duracao);
      const tempoOrganizacao = 20; 
      const horarioTerminoTotal = calcularHorarioTermino(horaString, tempoReuniao + tempoOrganizacao);

      db.runSync("INSERT OR IGNORE INTO usuarios (id, nome, cargo_setor) VALUES (1, 'Usuário Teste', 'Projeto de Extensão')");

      db.runSync(
        'INSERT INTO agendamentos (id_usuario, id_sala, data, horario_inicio, horario_termino) VALUES (?, ?, ?, ?, ?)',
        [1, salaID, dataString, horaString, horarioTerminoTotal]
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
    <View style={styles.container}>
      <Text style={styles.header}>Novo Agendamento</Text>
      
      <Text style={styles.label}>ID da Sala (Ex: 1 ou 2)</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={idSala} onChangeText={setIdSala} />

      {/* Botão que abre o Pop-up de Data */}
      <Text style={styles.label}>Data da Reunião</Text>
      <TouchableOpacity style={styles.inputBotao} onPress={() => setShowDatePicker(true)}>
        <Text style={dataString ? styles.textoPreenchido : styles.textoPlaceholder}>
          {dataString ? dataString : '📅 Toque para escolher a data'}
        </Text>
      </TouchableOpacity>

      {/* Pop-up do Calendário */}
      {showDatePicker && (
        <DateTimePicker
          value={dataSelecionada}
          mode="date"
          display="default"
          onChange={aoMudarData}
        />
      )}

      <View style={styles.row}>
        <View style={styles.coluna}>
          {/* Botão que abre o Pop-up de Hora */}
          <Text style={styles.label}>Início</Text>
          <TouchableOpacity style={styles.inputBotao} onPress={() => setShowTimePicker(true)}>
            <Text style={horaString ? styles.textoPreenchido : styles.textoPlaceholder}>
              {horaString ? horaString : '⏰ Escolher'}
            </Text>
          </TouchableOpacity>

          {/* Pop-up do Relógio */}
          {showTimePicker && (
            <DateTimePicker
              value={horaSelecionada}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={aoMudarHora}
            />
          )}
        </View>

        <View style={styles.coluna}>
          <Text style={styles.label}>Duração (Min)</Text>
          <TextInput style={styles.input} placeholder="Ex: 60" keyboardType="numeric" value={duracao} onChangeText={setDuracao} />
        </View>
      </View>

      <TouchableOpacity style={styles.botao} onPress={salvarAgendamento}>
        <Text style={styles.textoBotao}>Confirmar Agendamento</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8', padding: 20, paddingTop: 50 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#102A43' },
  label: { fontSize: 16, color: '#334E68', marginBottom: 5, fontWeight: '600' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D9E2EC', padding: 12, borderRadius: 8, marginBottom: 15 },
  // Novos estilos para os botões que substituíram os TextInputs
  inputBotao: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D9E2EC', padding: 15, borderRadius: 8, marginBottom: 15, justifyContent: 'center' },
  textoPlaceholder: { color: '#9FB3C8', fontSize: 16 },
  textoPreenchido: { color: '#334E68', fontSize: 16, fontWeight: '500' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  coluna: { width: '48%' }, 
  botao: { backgroundColor: '#007BFF', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  textoBotao: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});