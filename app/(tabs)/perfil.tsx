import { useState, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, 
  Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router'; 
import { db } from '../../src/database/databaseInit';

interface UsuarioPerfil {
  id: number;
  nome: string;
  email: string;
  cargo_setor: string;
}

export default function PerfilScreen() {
  const router = useRouter();

  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  useFocusEffect(
    useCallback(() => {
      try {
        const sessao = db.getFirstSync<{id_usuario: number}>('SELECT id_usuario FROM sessao LIMIT 1');
        if (!sessao) {
          router.replace('/login');
          return;
        }

        const user = db.getFirstSync<UsuarioPerfil>('SELECT id, nome, email, cargo_setor FROM usuarios WHERE id = ?', [sessao.id_usuario]);
        
        if (user) {
          setUsuarioId(user.id);
          setEmail(user.email);
          setNome(user.nome !== 'Novo Usuário' ? user.nome : '');
          setCargo(user.cargo_setor !== 'Estudante' ? user.cargo_setor : '');
        }
      } catch (error) {
        console.error(error);
      }
    }, [])
  );

  function salvarPerfil() {
    Keyboard.dismiss();

    if (!nome || !cargo || !senha || !confirmarSenha) {
      Alert.alert('Atenção', 'Preencha todos os campos para completar seu perfil.');
      return;
    }

    if (senha !== confirmarSenha) {
      Alert.alert('Erro', 'As senhas digitadas não coincidem.');
      return;
    }

    if (senha.length < 4) {
      Alert.alert('Atenção', 'Sua senha deve ter no mínimo 4 caracteres.');
      return;
    }

    try {
      db.runSync(
        'UPDATE usuarios SET nome = ?, cargo_setor = ?, senha = ? WHERE id = ?',
        [nome, cargo, senha, usuarioId]
      );
      
      Alert.alert('Sucesso', 'Perfil e senha salvos com sucesso! Agora você pode usar sua senha no próximo acesso.');
      setSenha('');
      setConfirmarSenha('');
      
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível salvar os dados do perfil.');
    }
  }

  function fazerLogout() {
    db.runSync('DELETE FROM sessao');
    router.replace('/login');
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView style={styles.flexContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          
          <View style={styles.headerRow}>
            <Text style={styles.header}>Meu Perfil</Text>
            <TouchableOpacity onPress={fazerLogout}>
              <Text style={styles.textoSair}>Sair do App</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.labelInfo}>E-mail de Acesso (Fixo)</Text>
            <Text style={styles.textoEmail}>{email}</Text>
          </View>

          <Text style={styles.label}>Nome Completo</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ex: André Luiz Cavalcante" 
            value={nome} 
            onChangeText={setNome} 
          />

          <Text style={styles.label}>Cargo / Setor</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ex: Engenharia de Dados / TI" 
            value={cargo} 
            onChangeText={setCargo} 
          />

          <Text style={styles.tituloSenha}>🔑 Criar Senha de Acesso</Text>
          
          <Text style={styles.label}>Nova Senha</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Digite uma senha forte" 
            secureTextEntry={true} // Esconde os caracteres
            value={senha} 
            onChangeText={setSenha} 
          />

          <Text style={styles.label}>Confirmar Senha</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Repita a senha" 
            secureTextEntry={true} 
            value={confirmarSenha} 
            onChangeText={setConfirmarSenha} 
          />

          <TouchableOpacity style={styles.botao} onPress={salvarPerfil}>
            <Text style={styles.textoBotao}>Salvar e Criar Senha</Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  flexContainer: { flex: 1, backgroundColor: '#F0F4F8' },
  container: { flex: 1, padding: 20, paddingTop: 50 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#102A43' },
  textoSair: { fontSize: 16, color: '#DC3545', fontWeight: 'bold' },
  
  cardInfo: { backgroundColor: '#E2E8F0', padding: 15, borderRadius: 8, marginBottom: 20 },
  labelInfo: { fontSize: 12, color: '#627D98', fontWeight: 'bold', textTransform: 'uppercase' },
  textoEmail: { fontSize: 16, color: '#102A43', fontWeight: 'bold', marginTop: 5 },

  tituloSenha: { fontSize: 18, fontWeight: 'bold', color: '#102A43', marginTop: 10, marginBottom: 15 },
  label: { fontSize: 14, color: '#334E68', marginBottom: 5, fontWeight: '600' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D9E2EC', padding: 12, borderRadius: 8, marginBottom: 15 },
  
  botao: { backgroundColor: '#28A745', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  textoBotao: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});