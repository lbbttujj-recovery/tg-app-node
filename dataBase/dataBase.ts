import sqlite3 from 'sqlite3'
import path from 'node:path'

interface User {
  id: number
  score: number
  created_at: number
  cards: string
  per_sec: number
  is_group_member: 0 | 1
}

type AddUser = Pick<User, 'id'>

type SaveScore = Pick<User, 'id' | 'score'>

type AddPerSec = Pick<User, 'id' | 'per_sec'>

const usersTablePath = path.resolve(__dirname, './users.db')
console.log(usersTablePath)

const CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            score INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            cards TEXT,
            per_sec INTEGER,
            is_group_member INTEGER DEFAULT 0
        )
    `

class Database {
  private db: sqlite3.Database

  constructor() {
    this.db = new sqlite3.Database(usersTablePath, (err) => {
      if (err) {
        console.error('Ошибка при подключении к базе данных:', err.message)
      } else {
        console.log('Подключение к SQLite базе данных установлено.')
        this.createTable()
      }
    })
  }

  public dropTable(): Promise<string> {
    return new Promise((resolve, reject) => {
      const query = 'DROP TABLE IF EXISTS users'
      this.db.run(query, (err) => {
        if (err) {
          reject('Ошибка при удалении таблицы: ' + err.message)
        } else {
          resolve('Таблица users была успешно удалена.')
        }
      })
    })
  }

  //1tap -> 2 -> 3

  private createTable(): void {
    this.db.run(CREATE_TABLE, (err) => {
      if (err) {
        console.error('Ошибка при создании таблицы:', err.message)
      } else {
        console.log('Таблица users готова к использованию.')
      }
    })
  }

  public addUser(user: AddUser): Promise<string> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('INSERT INTO users (id,score) VALUES (?, ?)')
      stmt.run(user.id, 0, (err: Error) => {
        if (err) {
          reject('Ошибка добавления данных: ' + err.message)
        } else {
          resolve('Пользователь добавлен.')
        }
      })
      stmt.finalize()
    })
  }

  public saveUserScore(save: SaveScore): Promise<string> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('UPDATE users SET score = ? WHERE id = ?')
      stmt.run(save.score, save.id, (err: Error) => {
        if (err) {
          reject('Ошибка добавления данных: ' + err.message)
        } else {
          resolve('Пользователь добавлен.')
        }
      })
    })
  }

  public addUserPerSec(add: AddPerSec): Promise<string> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('UPDATE users SET per_sec = ? WHERE id = ?')
      stmt.run(add.per_sec, add.id, (err: Error) => {
        if (err) {
          reject('Ошибка добавления данных: ' + err.message)
        } else {
          resolve('Пользователь добавлен.')
        }
      })
    })
  }

  public getAllUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM users', [], (err, rows: User[]) => {
        if (err) {
          reject('Ошибка при получении данных: ' + err.message)
        } else {
          resolve(rows)
        }
      })
    })
  }

  public getUser(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM users WHERE id = ?', [id], (err, rows: User[]) => {
        if (err) {
          reject('Ошибка при получении данных: ' + err.message)
        } else {
          console.log(rows)
          resolve(!!rows.length)
        }
      })
    })
  }

  private _getScore(id: number): Promise<User[]> {
    return new Promise((resolve, reject) => {
      console.log(id)
      this.db.all('SELECT score, per_sec FROM users WHERE Id = ?', [id], (err, rows: User[]) => {
        if (err) {
          reject('Ошибка при получении данных: ' + err.message)
        } else {
          resolve(rows)
        }
      })
    })
  }

  public getScore(id: number): Promise<User[]> {
    return new Promise((resolve, reject) => {
      this.getUser(id).then((exist) => {
        if (exist) {
          this._getScore(id)
            .then((res) => {
              resolve(res)
            })
            .catch((e) => {
              reject(e)
            })
        } else {
          this.addUser({ id }).then(() => {
            this._getScore(id)
              .then((res) => {
                resolve(res)
              })
              .catch((e) => {
                reject(e)
              })
          })
        }
      })
    })
  }

  public close(): void {
    this.db.close((err) => {
      if (err) {
        console.error('Ошибка при закрытии базы данных:', err.message)
      } else {
        console.log('Соединение с базой данных закрыто.')
      }
    })
  }
  public editGroupMember({ isAdd, id }: { isAdd: boolean; id: number }): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(isAdd, id)
      const stmt = this.db.prepare('UPDATE users SET is_group_member = ? WHERE id = ?')
      stmt.run(Number(isAdd), id, (err: Error) => {
        if (err) {
          console.log('here____')
          reject('Ошибка добавления данных: ' + err.message)
        } else {
          resolve('Пользователь добавлен.')
        }
      })
    })
  }
}

export default Database
