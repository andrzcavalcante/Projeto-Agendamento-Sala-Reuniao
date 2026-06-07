import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router'; 
import { inicializarBancoDeDados, db } from '../../src/database/databaseInit';

interface Sala {
  id: number;
  nome_sala: string;
  capacidade: number;
  recursos: string;
  qtd_agendamentos: number; 
}

export default function ListaSalasScreen() {
  const [salas, setSalas] = useState<Sala[]>([]);
  const router = useRouter(); 

  useEffect(() => {
    inicializarBancoDeDados();
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarSalas();
    }, [])
  );

  function carregarSalas() {
    try {

      const sessao = db.getFirstSync<{id_usuario: number}>('SELECT id_usuario FROM sessao LIMIT 1');
      
      if (!sessao) {
        router.replace('/login');
        return; 
      }

      const query = `
        SELECT s.*, 
        (SELECT COUNT(*) FROM agendamentos a WHERE a.id_sala = s.id) AS qtd_agendamentos
        FROM salas s
      `;
      const resultado = db.getAllSync<Sala>(query);
      
      if (resultado.length === 0) {
        db.runSync("INSERT INTO salas (nome_sala, capacidade, recursos) VALUES ('Sala 1 - Reunião', 10, 'TV')");
        db.runSync("INSERT INTO salas (nome_sala, capacidade, recursos) VALUES ('Sala 2 - Mentoria', 4, 'Monitor')");
        setSalas([...db.getAllSync<Sala>(query)]); 
      } else {
        setSalas([...resultado]);
      }
    } catch (error) {
      console.error("Erro ao buscar salas:", error);
    }
  }

  function fazerLogout() {
    // Apaga a sessão do banco local e manda de volta pro login
    db.runSync('DELETE FROM sessao');
    router.replace('/login');
  }

  const renderizarSala = ({ item }: { item: Sala }) => {
    const estaOcupada = item.qtd_agendamentos > 0;

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => router.push(`/sala/${item.id}`)}
      >
        <Text style={styles.titulo}>{item.nome_sala}</Text>
        <Text style={styles.texto}>Capacidade: {item.capacidade} pessoas</Text>
        <Text style={styles.texto}>Recursos: {item.recursos}</Text>
        
        <View style={estaOcupada ? styles.badgeOcupada : styles.badgeDisponivel}>
          <Text style={styles.badgeTexto}>
            {estaOcupada ? 'Ocupada (Ver Agenda)' : 'Disponível'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Cabeçalho com Botão de Sair */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Salas de Reunião</Text>
        <TouchableOpacity onPress={fazerLogout}>
          <Text style={styles.textoSair}>Sair</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.subHeader}>Toque em uma sala para ver os horários</Text>
      
      <FlatList 
        data={salas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderizarSala}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8', padding: 20, paddingTop: 50 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#102A43' },
  textoSair: { fontSize: 16, color: '#DC3545', fontWeight: 'bold' },
  subHeader: { fontSize: 14, color: '#627D98', marginBottom: 20, marginTop: 5 },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 3 },
  titulo: { fontSize: 18, fontWeight: 'bold', color: '#334E68' },
  texto: { fontSize: 14, color: '#627D98', marginTop: 5 },
  badgeDisponivel: { backgroundColor: '#28A745', padding: 5, borderRadius: 5, marginTop: 10, alignSelf: 'flex-start' },
  badgeOcupada: { backgroundColor: '#007BFF', padding: 5, borderRadius: 5, marginTop: 10, alignSelf: 'flex-start' },
  badgeTexto: { color: '#FFF', fontSize: 12, fontWeight: 'bold' }
});