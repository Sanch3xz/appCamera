import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from "@capacitor-community/sqlite";
import { PhotoItem } from "./IPhotoitem";

@Injectable({
  providedIn: 'root',
})
export class PhotoDbService {

  private sqlite = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;
  private readonly dbName = 'photos_db';

  async init(): Promise<void> {
    const consistency = await this.sqlite.checkConnectionsConsistency();
    const isConn = (await this.sqlite.isConnection(this.dbName, false)).result;

    if (consistency.result && isConn) {
      this.db = await this.sqlite.retrieveConnection(this.dbName, false);
    } else {
      this.db = await this.sqlite.createConnection(this.dbName, false, 'no-encryption', 1, false);
    }

    await this.db.open();

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS photos(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        imagePath TEXT NOT NULL,
        caption TEXT,
        photoDate TEXT NOT NULL,
        is_favorite INTEGER NOT NULL DEFAULT 0
      );
    `);
  }

  async savePhoto(photo: PhotoItem): Promise<void> {
    await this.db.run(
      `INSERT INTO photos (imagePath, caption, photoDate, is_favorite) VALUES (?, ?, ?, ?)`,
      [
        photo.imagePath,
        photo.caption,
        photo.photoDate,
        photo.isFavorite ? 1 : 0
      ]
    );
  }

  async getPhoto(): Promise<PhotoItem[]> {
    const result = await this.db.query(`
      SELECT id, imagePath, caption, photoDate, is_favorite
      FROM photos
      ORDER BY id DESC
    `);

    return (result.values ?? []).map((row: any) => ({
      id: row.id,
      imagePath: row.imagePath,
      caption: row.caption,
      photoDate: row.photoDate,
      isFavorite: row.is_favorite === 1,
    }));
  }

  async deletePhoto(id: number): Promise<void> {
    await this.db.run(`DELETE FROM photos WHERE id = ?`, [id]);
  }

  async updateFavorite(id: number, isFavorite: boolean): Promise<void> {
    await this.db.run(
      `UPDATE photos SET is_favorite = ? WHERE id = ?`,
      [isFavorite ? 1 : 0, id]
    );
  }

  async updateCaption(id: number, caption: string): Promise<void> {
    await this.db.run(
      `UPDATE photos SET caption = ? WHERE id = ?`,
      [caption, id]
    );
  }

}