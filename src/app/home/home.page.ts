import { Component, OnInit } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { AlertController } from '@ionic/angular';
import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

import { PhotoDbService } from "./photo-db.service";
import { PhotoItem } from "./IPhotoitem";

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {

  photos: PhotoItem[] = [];
  tempImage: string = '';

  constructor(
    private alertController: AlertController,
    private photoDb: PhotoDbService
  ) {}

  async ngOnInit() {
    await this.photoDb.init();
    this.loadPhotos();

    App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive && this.tempImage) {
        this.showCaptionAlert();
      }
    });
  }

  async loadPhotos() {
    const data = await this.photoDb.getPhoto();

  this.photos = data.map(photo => ({
    ...photo,
    imagePath: Capacitor.convertFileSrc(photo.imagePath) 
  }));
  }

  async takePicture() {

    const alert = await this.alertController.create({
      header: 'Permiso de cámara',
      message: 'La app necesita acceso a la cámara',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Permitir',
          handler: async () => {

            const image = await Camera.getPhoto({
              quality: 90,
              allowEditing: false,
              resultType: CameraResultType.Uri, // 🔥 CAMBIO
              source: CameraSource.Camera
            });

            if (image.webPath) {
              this.tempImage = await this.saveImage(image.webPath);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async saveImage(webPath: string): Promise<string> {
    const response = await fetch(webPath);
    const blob = await response.blob();

    const base64Data = await this.convertBlobToBase64(blob) as string;

    const fileName = new Date().getTime() + '.jpeg';

    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    });

    return savedFile.uri;
  }

  convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

  async showCaptionAlert() {

    const alert = await this.alertController.create({
      header: 'Descripción',
      inputs: [
        {
          name: 'caption',
          type: 'text',
          placeholder: 'Escribe una descripción'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {

            const captionFinal = data.caption?.trim() || 'Por defecto';

            await this.photoDb.savePhoto({
              imagePath: this.tempImage,
              caption: captionFinal,
              photoDate: new Date().toLocaleDateString(),
              isFavorite: false
            });

            this.tempImage = '';
            this.loadPhotos();
          }
        }
      ]
    });

    await alert.present();
  }

  async deletePhoto(photo: PhotoItem) {
    if (!photo.id) return;

    await this.photoDb.deletePhoto(photo.id);

    const fileName = photo.imagePath.split('/').pop();
    if (fileName) {
      await Filesystem.deleteFile({
        path: fileName,
        directory: Directory.Data
      });
    }

    this.loadPhotos();
  }

  async toggleFavorite(photo: PhotoItem) {
    if (!photo.id) return;
    await this.photoDb.updateFavorite(photo.id, !photo.isFavorite);
    this.loadPhotos();
  }

  async editCaption(photo: PhotoItem) {

    const alert = await this.alertController.create({
      header: 'Editar descripción',
      inputs: [
        {
          name: 'caption',
          type: 'text',
          value: photo.caption
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {

            if (!photo.id) return;

            const newCaption = data.caption?.trim() || 'Por defecto';

            await this.photoDb.updateCaption(photo.id, newCaption);
            this.loadPhotos();
          }
        }
      ]
    });

    await alert.present();
  }

}