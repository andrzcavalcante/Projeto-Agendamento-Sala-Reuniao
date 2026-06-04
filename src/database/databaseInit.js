import * as SQLite from 'expo-sqlite';

// Abre (ou cria) o arquivo do banco de dados no celular
export const db = SQLite.openDatabaseSync('agendamento_salas.db');

export function inicializarBancoDeDados() {
  try {
    // Ativa as chaves estrangeiras e cria as tabelas
    db.execSync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          cargo_setor TEXT NOT NULL
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
    `);
    console.log("Banco de dados inicializado com sucesso!");
  } catch (error) {
    console.error("Erro ao inicializar o banco de dados:", error);
  }
}