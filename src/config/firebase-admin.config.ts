// import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';

@Injectable()
export class initializeFirebaseAdmin {
  constructor() {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      storageBucket:process.env.storageBucket,// "global-auth-49737.appspot.com"
    });
  }

  getStorage = () => {
    return admin.storage();
  };
}

export default admin;
