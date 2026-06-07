import * as SQLite from 'expo-sqlite';

// Forçamos a criação de um banco V3, limpo e com a nova estrutura de senha
export const db = SQLite.openDatabaseSync('agendamento_salas_v4.db');

export function inicializarBancoDeDados() {
  try {
    db.execSync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT,
          email TEXT UNIQUE NOT NULL,
          cargo_setor TEXT,
          senha TEXT 
      );

      CREATE TABLE IF NOT EXISTS salas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome_sala TEXT NOT NULL,
          capacidade INTEGER NOT NULL,
          recursos TEXT
      );

      CREATE TABLE IF NOT EXISTS agendamentos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          id_usuario INTEGER NOT NULL,
          id_sala INTEGER NOT NULL,
          data TEXT NOT NULL,
          horario_inicio TEXT NOT NULL,
          horario_termino TEXT NOT NULL,
          FOREIGN KEY (id_usuario) REFERENCES usuarios (id) ON DELETE CASCADE,
          FOREIGN KEY (id_sala) REFERENCES salas (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sessao (
          id INTEGER PRIMARY KEY CHECK (id = 1), 
          id_usuario INTEGER NOT NULL,
          FOREIGN KEY (id_usuario) REFERENCES usuarios (id) ON DELETE CASCADE
      );
    `);
    console.log("Banco de dados V3 (Com suporte a Senha) inicializado com sucesso!");
  } catch (error) {
    console.error("Erro ao inicializar o banco V3:", error);
  }
}