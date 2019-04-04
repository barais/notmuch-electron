import { Injectable } from '@angular/core';
import { ElectronService } from './providers/electron.service';
import RTM from 'rtm-api';
import * as path from 'path';
import log from 'electron-log';


@Injectable({
  providedIn: 'root'
})
export class RtmService {
  rtmclient;
  rtmusername: string;
  rtmfullname: string;
  enable: boolean;
  rtmfrob: {};
  path;
  API_KEY: string;
  API_SECRET: string;
  token: any ;
  validtoken = false;
  RTM;
  constructor(private eservice: ElectronService) {

    if (this.isElectron()) {
      this.RTM = window.require('rtm-api');
    }
  }


  getValidToken(): boolean {
    return this.validtoken;
  }

  init() {

    this.rtmclient = new this.RTM(this.API_KEY, this.API_SECRET, RTM.PERM_WRITE); // An instance of RTMClient

    const userDataPath = (this.eservice.remote.app).getPath('userData');
    this.path = path.join(userDataPath, 'rtmconfig.json');
    this.parseRTMConfigFile(this.path);

  }

  parseRTMConfigFile(filePath) {
    // We'll try/catch it in case the file doesn't exist yet, which will be the case on the first application run.
    // `fs.readFileSync` will return a JSON string which we then parse into a Javascript object
    try {
      this.token =  JSON.parse('' + this.eservice.fs.readFileSync(filePath));
      this.isAuthentified().then(b => {
        this.validtoken = b;
      }).catch(e => {
        this.validtoken = false;
      });
    } catch (error) {
      // if there was some kind of error, return the passed in defaults instead.
      this.token =  {};
    }
  }
  saveRTMConfigFile(filePath) {
    // We'll try/catch it in case the file doesn't exist yet, which will be the case on the first application run.
    // `fs.readFileSync` will return a JSON string which we then parse into a Javascript object
    try {
      this.eservice.fs.writeFileSync(filePath, this.rtmclient.user.exportToString(this.token));
    } catch (error) {
      // if there was some kind of error, return the passed in defaults instead.
      this.token =  {};
      }
  }



  enableRTM(): boolean {
    return this.enable;
  }

  setEnableRTM(b: boolean)  {
    this.enable = b;
  }

  setAPI_KEY(b: string) {
     this.API_KEY = b;
  }
  setAPI_SECRET(b: string) {
    this.API_SECRET = b;
 }

  isAuthentified(): Promise<boolean> {
    const p = new Promise<boolean>((resolve, reject) => {
      let token = '';
      if (this.token.authToken != null) {
        token = this.token.authToken;
      }
      this.rtmclient.auth.verifyAuthToken(token, (err, verified) => {
        if (err) {
          reject(false);
        }
        this.validtoken = verified;
        resolve(verified);
      });
//        resolve(true);
    });
    return p;
  }


  getURLApi(): Promise<string> {
  //  console.log('ok');

    const p = new Promise<string>((resolve, reject) => {
      this.isAuthentified().then(verified => {
        if (!verified) {
          this.rtmclient.auth.getAuthUrl((err, authUrl, frob) => {
            if (err) {
              reject(err.toString());
            } else {
              this.rtmfrob = frob;
              resolve(authUrl);
            }
          });
        }
      }).catch(e => {
        console.log(e.toString());
        resolve(e.toString());
      });
    });
    return p;
  }

  getAndSaveAuthToken(): Promise<void> {
    const p = new Promise<void>((resolve, reject) => {

      this.rtmclient.auth.getAuthToken(this.rtmfrob, (err, user) => {
        if (err) {
          console.error(err.toString());
          reject();
        } else {

          // If successful, the returned user will include the property `authToken`
          this.token = user;

          this.rtmclient.user.import(this.token);
          const userDataPath = (this.eservice.remote.app).getPath('userData');
          const path1 = path.join(userDataPath, 'rtmconfig.json');
          this.saveRTMConfigFile(path1);
          this.validtoken = true;
          // Save the user for making authenticated API calls via user.get()
          resolve();
        }
      });
    });
    return p;
  }


  addTask(topic: string, d: Date, id: string): Promise<boolean> {
    const p = new Promise<boolean>((resolve, reject) => {
      this.rtmclient.auth.verifyAuthToken(this.token.authToken, (err, verified) => {
        if (err) {
          this.validtoken = false;
          resolve(false);
          return;
        }
        if (verified) {
          const user = this.rtmclient.user.import(this.token);
          const dates = '' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
          user.tasks.add(topic, {
            due: dates,
            note: id
            // tslint:disable-next-line:no-shadowed-variable
          }, (err: any) => {
            if (err) {
              resolve(false);
              console.log(err);
            } else {
              resolve(true);
            }
          });
        } else {
          this.validtoken = false;
          resolve(false);
        }

      });
    });
    return p;
  }

  isElectron = () => {
    return window && window.process && window.process.type;
  }


}
