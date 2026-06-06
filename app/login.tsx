import { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Keyboard, 
  TouchableWithoutFeedback, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../src/database/databaseInit';

// 🔒 LISTA DE E-MAILS PERMITIDOS (Apenas estes acessam o app)
const EMAILS_PERMITIDOS = [
  'admin@instituicao.br',
  'alc@mail.com',
  'andre.cavalcante@instituicao.br', 
  // Pode colar a sua série de e-mails aqui dentro, sempre entre aspas e separados por vírgula
];

export default function LoginScreen() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [senhaDigitada, setSenhaDigitada] = useState('');
  const [codigoDigitado, setCodigoDigitado] = useState('');
  const [codigoGerado, setCodigoGerado] = useState<string | null>(null);
  
  const [etapa, setEtapa] = useState<'email' | 'senha' | 'codigo'>('email');

  function verificarFluxoLogin() {
    const emailTratado = email.toLowerCase().trim();

    if (!emailTratado.includes('@') || !emailTratado.includes('.')) {
      Alert.alert('Atenção', 'Por favor, insira um e-mail institucional válido.');
      return;
    }

    Keyboard.dismiss();

    // 🛑 VALIDAÇÃO DA WHITELIST
    if (!EMAILS_PERMITIDOS.includes(emailTratado)) {
      Alert.alert(
        'Acesso Restrito', 
        'Este e-mail não possui autorização para acessar este aplicativo. Solicite o cadastro à coordenação.'
      );
      return;
    }

    try {
      const user = db.getFirstSync<{ senha: string | null }>(
        'SELECT senha FROM usuarios WHERE email = ?', 
        [emailTratado]
      );

      if (user && user.senha) {
        setEtapa('senha');
      } else {
        solicitarCodigo();
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao verificar o e-mail no banco.');
    }
  }

  function solicitarCodigo() {
    const codigo = Math.floor(1000 + Math.random() * 9000).toString();
    setCodigoGerado(codigo);
    setEtapa('codigo');
    Keyboard.dismiss();

    console.log(`\n==================================`);
    console.log(`📧 SIMULAÇÃO DE DISPARO DE E-MAIL`);
    console.log(`Para: ${email}`);
    console.log(`Código de Acesso: ${codigo}`);
    console.log(`==================================\n`);
    
    Alert.alert('Primeiro Acesso', `Código enviado para testes do MVP: ${codigo}`);
  }

  function validarCodigoELogar() {
    Keyboard.dismiss();

    if (codigoDigitado !== codigoGerado) {
      Alert.alert('Erro', 'O código digitado está incorreto.');
      return;
    }

    try {
      let user = db.getFirstSync<{ id: number }>('SELECT id FROM usuarios WHERE email = ?', [email.toLowerCase().trim()]);

      if (!user) {
        const result = db.runSync(
          "INSERT INTO usuarios (nome, email, cargo_setor) VALUES (?, ?, ?)", 
          ['Novo Usuário', email.toLowerCase().trim(), 'Estudante']
        );
        user = { id: result.lastInsertRowId };
      }

      persistirSessao(user.id);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Erro ao processar o login por código.');
    }
  }

  function validarSenhaELogar() {
    Keyboard.dismiss();

    try {
      const user = db.getFirstSync<{ id: number; senha: string }>(
        'SELECT id, senha FROM usuarios WHERE email = ?', 
        [email.toLowerCase().trim()]
      );

      if (user && user.senha === senhaDigitada) {
        persistirSessao(user.id);
      } else {
        Alert.alert('Erro', 'Senha incorreta. Tente novamente.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao validar a senha.');
    }
  }

  function persistirSessao(idUsuario: number) {
    db.runSync('DELETE FROM sessao');
    db.runSync('INSERT INTO sessao (id_usuario) VALUES (?)', [idUsuario]);
    
    setSenhaDigitada('');
    setCodigoDigitado('');
    setCodigoGerado(null);

    router.replace('/');
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={styles.flexContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.logo}>📅 Reserva de Salas</Text>
          <Text style={styles.subTitulo}>Projeto de Extensão</Text>

          <View style={styles.card}>
            
            {etapa === 'email' && (
              <>
                <Text style={styles.label}>E-mail Institucional</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="exemplo@instituicao.br" 
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email} 
                  onChangeText={setEmail}
                  returnKeyType="next"
                  onSubmitEditing={verificarFluxoLogin}
                />
                <TouchableOpacity style={styles.botao} onPress={verificarFluxoLogin}>
                  <Text style={styles.textoBotao}>Avançar</Text>
                </TouchableOpacity>
              </>
            )}

            {etapa === 'senha' && (
              <>
                <Text style={styles.label}>Digite sua Senha</Text>
                <Text style={styles.dica}>Usuário: {email}</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Sua senha cadastrada" 
                  secureTextEntry={true}
                  value={senhaDigitada} 
                  onChangeText={setSenhaDigitada}
                  returnKeyType="go"
                  onSubmitEditing={validarSenhaELogar}
                />
                <TouchableOpacity style={styles.botao} onPress={validarSenhaELogar}>
                  <Text style={styles.textoBotao}>Entrar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.botaoVoltar} onPress={solicitarCodigo}>
                  <Text style={styles.textoBotaoVoltar}>Entrar com código por e-mail</Text>
                </TouchableOpacity>
              </>
            )}

            {etapa === 'codigo' && (
              <>
                <Text style={styles.label}>Código de Verificação</Text>
                <Text style={styles.dica}>Enviado para: {email}</Text>
                <TextInput 
                  style={styles.inputCodigo} 
                  placeholder="0000" 
                  keyboardType="numeric"
                  maxLength={4}
                  value={codigoDigitado} 
                  onChangeText={setCodigoDigitado} 
                  returnKeyType="done"
                  onSubmitEditing={validarCodigoELogar}
                />
                <TouchableOpacity style={styles.botao} onPress={validarCodigoELogar}>
                  <Text style={styles.textoBotao}>Validar e Entrar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.botaoVoltar} onPress={() => setEtapa('email')}>
                  <Text style={styles.textoBotaoVoltar}>Voltar</Text>
                </TouchableOpacity>
              </>
            )}

          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  flexContainer: { flex: 1, backgroundColor: '#102A43' },
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  logo: { fontSize: 32, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginBottom: 5 },
  subTitulo: { fontSize: 16, color: '#9FB3C8', textAlign: 'center', marginBottom: 40 },
  card: { backgroundColor: '#FFF', padding: 25, borderRadius: 15, elevation: 5 },
  label: { fontSize: 16, color: '#334E68', fontWeight: 'bold', marginBottom: 10 },
  dica: { fontSize: 14, color: '#627D98', marginBottom: 15 },
  input: { backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#D9E2EC', padding: 15, borderRadius: 8, marginBottom: 20, fontSize: 16 },
  inputCodigo: { backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#D9E2EC', padding: 15, borderRadius: 8, marginBottom: 20, fontSize: 24, textAlign: 'center', letterSpacing: 10, fontWeight: 'bold' },
  botao: { backgroundColor: '#007BFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  textoBotao: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  botaoVoltar: { marginTop: 15, alignItems: 'center' },
  textoBotaoVoltar: { color: '#627D98', fontSize: 14, fontWeight: 'bold' }
});