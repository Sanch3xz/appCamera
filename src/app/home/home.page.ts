import { Component, OnInit } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { AlertController } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {

  photos: {image: string, date: string, caption: string}[] = [];

  constructor(
    private alertController: AlertController,
    private storage: Storage
  ) {}

  async ngOnInit() {
    await this.storage.create();
    this.loadPhotos();
  }

  async loadPhotos(){
    const data = await this.storage.get('photos');
    if(data){
      this.photos = data;
    }
  }

  async savePhotos(){
    await this.storage.set('photos', this.photos);
  }

  async takePicture(){

    const alertPermiso = await this.alertController.create({
      header: 'Permiso de cámara',
      message: 'La app necesita acceso a la cámara para tomar fotos',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Permitir',
          handler: async () => {

            const image = await Camera.getPhoto({
              quality: 90,
              allowEditing: false,
              resultType: CameraResultType.DataUrl,
              source: CameraSource.Camera
            });

            const alertCaption = await this.alertController.create({
              header: 'Descripción',
              inputs: [
                {
                  name: 'caption',
                  type: 'text',
                  placeholder: 'Escribe una descripción'
                }
              ],
              buttons: [
                {
                  text: 'Cancelar',
                  role: 'cancel'
                },
                {
                  text: 'Guardar',
                  handler: async (data) => {

                    const captionFinal = data.caption && data.caption.trim() !== ''
                      ? data.caption
                      : 'Por defecto';

                    this.photos.unshift({
                      image: image.dataUrl || '',
                      date: new Date().toLocaleDateString(),
                      caption: captionFinal
                    });

                    await this.savePhotos();
                  }
                }
              ]
            });

            await alertCaption.present();
          }
        }
      ]
    });

    await alertPermiso.present();
  }

  async deletePhoto(index: number) {

    const alert = await this.alertController.create({
      header: 'Eliminar',
      message: '¿Seguro que quieres eliminar esta foto?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          handler: async () => {
            this.photos.splice(index, 1);
            await this.savePhotos();
          }
        }
      ]
    });

    await alert.present();
  }

}