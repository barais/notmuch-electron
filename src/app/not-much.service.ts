import { Injectable, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import Thread from './thread';
import { TreeNode } from 'primeng/api';
import log from 'electron-log';
import INotMuchService from './inot-much-service';
import { ElectronService } from './providers/electron.service';
import nodemailer from 'nodemailer';
import { Mail } from './mail';
import jsel from 'jsel';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { RtmService } from './rtm.service';
import * as $ from 'jquery';
import { Observable } from 'rxjs';
import { from } from 'rxjs';
// tslint:disable:max-line-length
import {imap} from 'imap';



@Injectable({
  providedIn: 'root'
})
export class NotMuchService implements INotMuchService {
  draftsendtransporter;
  transporters: Map<string, any> = new Map();
  signatures: Map<string, string> = new Map();
  draftfolders: Map<string, string> = new Map();
  sendfolders: Map<string, string> = new Map();
  shortcutqueries: Array<any> = [];
  shortcutmailtyping: Array<any> = [];
  defaultoutputfolder: String;
  colortags: Array<any> = [];

  mails: Map<string, string[]> = new Map();
  allThread = false;
  includeSpamThread = false;
  path;
  data: any = {};
  froms: string[] = [];
  notmuchpath: string;
  base64path: string;
  notmuchaddresspath: string;
  mktemppath: string;
  localmailfolder: string;
  tmpfilepath: string;
  intervalOutbox;
  defautEventMailInvit: string;
  defautEventMailCalendar: string;
  defautICSUser: string;
  localmailfoldermultiaccounts: boolean;
  defaultquery: string;

  nodemailer;
  ICAL;
  imap1;
  mailbox = "INBOX";
  refresh: () => any;

  user: string;
  password: string;
  host: string;
  port: Number;
  tls: boolean;

  constructor(private eservice: ElectronService, private sanitizer: DomSanitizer, private rtmservice: RtmService) {
    if (this.isElectron()) {
      this.nodemailer = window.require('nodemailer');
      this.ICAL = window.require('ical.js');
    }
    this.draftsendtransporter = this.nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });

    const userDataPath = (this.eservice.remote.app).getPath('userData');
    this.path = path.join(userDataPath, 'config.json');
    // log.info(this.path);
    this.data = this.parseDataFile(this.path, {
      'smtpaccounts': [{
        'name': 'rennes1',
        'transport': {
          'sendmail': true,
          'newline': 'unix',
          'args': ['-a', 'rennes1'],
          'path': '/usr/sbin/sendmail'
        },
        'from': 'olivier.barais@univ-rennes1.fr',
        'signature': '',
        'sentfolder': 'Sent',
        'draftfolder': 'Drafts'
      }
      ],
      'imapaccounts': [{
        'name': 'inria',
        user: 'test',
        password: 'test',
        host: 'zimbra.inria.fr',
        port: 993,
        tls: true,
      }
      ],
      'defaultoutputfolder': 'Outbox',
      'notmuchpath': '/usr/bin/notmuch',
      'base64path': '/usr/bin/base64',
      'notmuchaddresspath': '/usr/bin/notmuch-addrlookup',
      'mktemppath': '/usr/bin/mktemp',
      'localmailfolder': '/home/barais/mail',
      'localmailfoldermultiaccounts': true,
      'defaultquery': 'path:IRISA/INBOX/**',
      'tmpfilepath': '/tmp/titi.XXXXXXX',
      'defautEventMailInvit': '',
      'defautEventMailCalendar': '',
      'defautICSUser': '',
      'shortcutqueries': [
        {
          'shortcut': 'g l',
          'query': 'path:INBOX/** -tag:list'
        }
      ],
      'shortcutmailtyping': [
        {
          'shortcut': 'cor',
          'formula': 'Cordialement'
        }
      ],
      'colortags': [
        {
          'tags': 'todo',
          'color': 'red'
        }
      ]
    });


    this.data.smtpaccounts.forEach(smtp => {
      const transporter = this.nodemailer.createTransport(smtp.transport);
      this.froms.push(smtp.from);
      // log.info(smtp.from);
      this.transporters.set(smtp.from, transporter);
      this.signatures.set(smtp.from, smtp.signature);
      this.draftfolders.set(smtp.from, smtp.draftfolder);
      this.sendfolders.set(smtp.from, smtp.sentfolder);
    });
    //TODO Manage multiaccount
    this.data.imapaccounts.forEach(ima => {
      this.user = ima.user;
      this.password = '' + this.eservice.childProcess.execSync(ima.password);
      this.host = ima.host;
      this.port = ima.port;
      this.tls = ima.tls;

    });
    console.log(this.password);
    if (this.data.notmuchpath != null) {
      this.notmuchpath = this.data.notmuchpath;
    } else {
      this.notmuchpath = '/usr/bin/notmuch';
    }
    if (this.data.defaultoutputfolder != null) {
      this.defaultoutputfolder = this.data.defaultoutputfolder;
    } else {
      this.defaultoutputfolder = 'Outbox';
    }


    if (this.data.notmuchaddresspath != null) {
      this.notmuchaddresspath = this.data.notmuchaddresspath;
    } else {
      this.notmuchaddresspath = '/usr/bin/notmuch-addrlookup';
    }
    if (this.data.mktemppath != null) {
      this.mktemppath = this.data.mktemppath;
    } else {
      this.mktemppath = '/usr/bin/mktemp';
    }
    if (this.data.localmailfolder != null) {
      this.localmailfolder = this.data.localmailfolder;
    } else {
      this.localmailfolder = '/home/barais/mail';
    }
    if (this.data.localmailfoldermultiaccounts != null) {
      this.localmailfoldermultiaccounts = this.data.localmailfoldermultiaccounts;
    } else {
      this.localmailfoldermultiaccounts = true;
    }
    if (this.data.defaultquery != null) {
      this.defaultquery = this.data.defaultquery;
    } else {
      this.defaultquery = 'path/INBOX/**';
    }


    if (this.data.base64path != null) {
      this.base64path = this.data.base64path;
    } else {
      this.base64path = '/usr/bin/base64';
    }
    if (this.data.tmpfilepath != null) {
      this.tmpfilepath = this.data.tmpfilepath;
    } else {
      this.tmpfilepath = '/tmp/titi.XXXXXXX';
    }
    if (this.data.defautEventMailInvit != null) {
      this.defautEventMailInvit = this.data.defautEventMailInvit;
    } else {
      this.defautEventMailInvit = '';
    }
    if (this.data.defautEventMailCalendar != null) {
      this.defautEventMailCalendar = this.data.defautEventMailCalendar;
    } else {
      this.defautEventMailCalendar = '';
    }
    if (this.data.defautICSUser != null) {
      this.defautICSUser = this.data.defautICSUser;
    } else {
      this.defautICSUser = '';
    }

    if (this.data.rtm != null) {
      this.rtmservice.setEnableRTM(true);
      this.rtmservice.setAPI_KEY(this.data.rtm.API_KEY);
      this.rtmservice.setAPI_SECRET(this.data.rtm.API_SECRET);
      this.rtmservice.init();
    } else {
      this.rtmservice.setEnableRTM(false);
    }

    if (this.data.shortcutqueries != null && Array.isArray(this.data.shortcutqueries)) {
      this.data.shortcutqueries.forEach(short => this.shortcutqueries.push(short));
    }

    if (this.data.shortcutmailtyping != null && Array.isArray(this.data.shortcutmailtyping)) {
      this.data.shortcutmailtyping.forEach(short => this.shortcutmailtyping.push(short));
    }
    if (this.data.colortags != null && Array.isArray(this.data.colortags)) {
      this.data.colortags.forEach(colortag => this.colortags.push(colortag));
    }

    this.intervalOutbox = setInterval(() => this.flushOutBox(), 120 * 1000);

  }

  parseDataFile(filePath, defaults) {
    // We'll try/catch it in case the file doesn't exist yet, which will be the case on the first application run.
    // `fs.readFileSync` will return a JSON string which we then parse into a Javascript object
    try {
      return JSON.parse('' + this.eservice.fs.readFileSync(filePath));
    } catch (error) {
      // if there was some kind of error, return the passed in defaults instead.
      return defaults;
    }
  }

  setAllthread(thread) {
    this.allThread = thread;
  }

  setIncludeSpamAndTrash(spam) {
    this.includeSpamThread = spam;
  }


  getFroms(): string[] {
    return this.froms;
  }

  getDirectories(path1): string[] {

    let res = this.getAccountDirectories(path1);
    const subfolder = [];
    res.forEach(e => {
      const res1 = this.getFolderDirectories(this.localmailfolder + '/' + e);
      res1.forEach(folder => subfolder.push(e + '.' + folder));
    });
    console.log(subfolder.length);
    res = res.concat(...subfolder);
    return res;
  }

  getAccountDirectories(path1): string[] {

    return this.eservice.fs.readdirSync(path1).filter((file) => {
      return this.eservice.fs.statSync(path1 + '/' + file).isDirectory() && !((file + '').startsWith('.'));
    });
  }

  getFolderDirectories(path1): string[] {

    return this.eservice.fs.readdirSync(path1).filter((file) => {
      return this.eservice.fs.statSync(path1 + '/' + file).isDirectory() && !((file + '').startsWith('.'));
    });
  }


  execFilePromise(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      this.eservice.childProcess.execFile(command, args, { maxBuffer: 1024 * 10000 }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      });
    });
  }
  execPromise(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.eservice.childProcess.exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      });
    });
  }


  showSaveAsDialog(name, messageid, attachmentid) {
    const userChosenPath = this.eservice.remote.dialog.showSaveDialog({ defaultPath: name });
    this.saveAttachmentContent(messageid, attachmentid, userChosenPath).then(s => log.info(s));

  }


  getMailAddress(query: any): Observable<string[]> { // } , ret: (res: string[]) => any) {
    return from(new Promise<string[]>((resolve, reject) => {
      if (query.length < 3) {
        resolve([]);
      } else {
        if (this.mails.has(query)) {
          resolve(this.mails.get(query));
        } else {
          this.eservice.childProcess.exec(this.notmuchaddresspath + ' \'' + query + '\'', (err, stdout) => {
            if (err) {
              reject();
            } else {
              this.mails.set(query, ('' + stdout).split('\n'));
              resolve(('' + stdout).split('\n'));
            }
          });
        }
      }
    }
    ));
  }

  getTags(ret: (res: string[]) => any) {
    //    const promise1 = new Promise<string[]>((resolve, reject) => {
    if (this.includeSpamThread) {
      ret(('' + this.eservice.childProcess.execSync(this.notmuchpath + ' search --exclude=false --output=tags \'*\'')).split('\n').filter(el => el !== ''));
    } else {
      ret(('' + this.eservice.childProcess.execSync(this.notmuchpath + ' search --exclude=true --output=tags \'*\'')).split('\n').filter(el => el !== ''));
    }
    // .then(e => {
    //        const res = e.split('\n').filter(el => el !== '');
    //       resolve(res);
    //    });
    // });
    // return promise1;
  }





  getMailFolder(): TreeNode[] {
    const paths = this.getDirectories(this.localmailfolder);
    const res: TreeNode[] = [];
    const cache: Map<string, TreeNode> = new Map();

    paths.forEach(e => {
      const tokens = e.split('.');
      if (tokens.length === 1) {
        const t: TreeNode = {
          label: e,
          expandedIcon: 'fas fa-envelope-open',
          collapsedIcon: 'fas fa-envelope',
          expanded: true,
          children: []
        };
        res.push(t);
        cache.set(e, t);
      } else if (tokens.length > 1) {
        const t: TreeNode = {
          label: tokens[tokens.length - 1],
          expandedIcon: 'fa fa-folder-open',
          collapsedIcon: 'fa fa-folder',
          children: []
        };
        if (cache.has(tokens[tokens.length - 2])) {
          cache.get(tokens[tokens.length - 2]).children.push(t);
          t.parent = cache.get(tokens[tokens.length - 2]);
        } else {
          t.label = e;
          res.push(t);
        }
        cache.set(tokens[tokens.length - 1], t);
      }
    });
    return res;
  }
  // notmuch tag +flagged thread:000000000001e987 or thread:000000000001e987
  addTag(threadIds: string[], tag: string) {
    const query = threadIds.join(' OR ');
    const child = this.eservice.childProcess.execSync(this.notmuchpath + ' tag +' + tag + ' \'' + query + ' \'');

  }

  // notmuch tag +flagged thread:000000000001e987 or thread:000000000001e987
  removeTag(threadIds: string[], tag: string) {
    const query = threadIds.join(' OR ');
    const child = this.eservice.childProcess.exec(this.notmuchpath + ' tag -' + tag + ' \'' + query + ' \'');

  }
  // notmuch count query
  countAllThread(query: string): Observable<number> {

    return from(new Promise<number>((resolve1, reject) => {
      this.eservice.childProcess.exec(this.notmuchpath + ' count \'' + query + '\'',
        // tslint:disable-next-line:no-unused-expression
        (error, stdout, stderr) => {
          if (error) {
            reject();
          }
          resolve1(Number('' + stdout));
        }
      );

    }));
  }

  getThread(query: string, offset: number, rows: number, ret: (res: Thread[]) => any) {

    if (this.includeSpamThread) {
      const stdout = this.eservice.childProcess.execFileSync(this.notmuchpath, ('search --exclude=false --format=json' + ' --offset=' + (offset) + ' --limit=' + rows + ' ' + query).split(' '));
      ret(<Thread[]>JSON.parse(`${stdout}`));
    } else {
      const stdout = this.eservice.childProcess.execFileSync(this.notmuchpath, ('search --exclude=true --format=json' + ' --offset=' + (offset) + ' --limit=' + rows + ' ' + query).split(' '));
      ret(<Thread[]>JSON.parse(`${stdout}`));

    }
  }

  delete(threadIds: string[]) {
    this.addTag(threadIds, 'deleted');
  }

  // TODO
  spam(threadIds: string[]) {
    this.addTag(threadIds, 'spam');
  }

  // TODO
  archive(threadIds: string[]) {
    this.addTag(threadIds, 'archive');
  }

  getMails(query: string): Promise<Mail[]> {
    //    query = query.replace(/$/g, '\$');
    //    const params = [];
    //    query.split(' ').forEach(el => params.push('\'' + el + '\''));
    const stdout = this.eservice.childProcess.execSync(this.notmuchpath + ' show --format=json' + ' --include-html' + ' --entire-thread=' + this.allThread + ' \'' + query + '\'');
    // log.info('' + query);
    // log.info('' + stdout);
    const dom1 = jsel(JSON.parse('' + stdout));
    const m = dom1.selectAll('//*[headers]') as Mail[];
    const promise1 = new Promise<Mail[]>((resolve1, reject) => {

      m.forEach(message => {

        message.attachments = [];

        const dom = jsel(message);
        if (dom.selectAll('//@content-type').includes('text/html')) {
          dom.selectAll('//@content-disposition').includes('inline');
          const inlines = dom.selectAll('//*[@content-disposition="inline"]');
          message.inlines = [];
          inlines.filter(e =>    e['content-id'] !== undefined ).forEach(e => {
            console.log(e['content-id']);
            //  notmuch show --part=5  --entire-thread=false --format=raw id:080326cc-9b0c-9824-c2eb-7a4ac3bf48d6@2PE-bretagne.eu | base64 -w 0
            const contentbase64 = '' + this.eservice.childProcess.execSync(this.notmuchpath + ' show --part=' + e.id + ' --entire-thread=false --format=raw \'id:' + message.id + '\' | ' + this.base64path + ' -w 0');
            //          console.log(this.notmuchpath + ' show --part=' + e.id + ' --entire-thread=false --format=raw \'id:' +  message.id + '\' | ' + this.base64path + ' -w 0');
            //          console.log('base64 ' + contentbase64);
            message.inlines.push({
              messageid: message.id,
              partid: e.id,
              name: e.filename,
              'content-id': e['content-id'],
              'content-type': e['content-type'],
              content: contentbase64
            });
          });
          inlines.filter(e => e['content-id'] === undefined && e['filename'] !== undefined).forEach(e => {
            console.log(e);
            message.attachments.push({
              messageid: message.id,
              partid: e.id,
              name: e.filename
            });
          });

          message.content = this.getHtmlFromMessage(message);
        }
        const res = dom.selectAll('//*[@content-disposition="attachment"]');
        res.forEach(e => {
          message.attachments.push({
            messageid: message.id,
            partid: e.id,
            name: e.filename
          });
        });
      });
      resolve1(m);
    });
    return promise1;


  }

  // Add your own mail address as BCC to all outgoing mails and use some type of server side filtering to automatically move them to the sent folder. This is computationally less expensive for your application, but has the additional filtering requirement for the mail server.

  sendMail(sender: string, to: string, cc: string, bcc: string, subject: string, html: string, files: Map<any, any>, isDraft: boolean, mailreference: string, mailinReplyTo: string, ret: (res: boolean) => any) {
    // TODO
    //    inReplyTo - The Message-ID this message is replying to
    //    references
    // DOit for sav in outgoing

    const attachs = [];
    const icalEvents = [];
    const promises = [];
    const tmpfiles = [];

    let references = mailreference;
    let inReplyTo = mailinReplyTo;
    if (references === '') {
      references = null;
    }
    if (inReplyTo === '') {
      inReplyTo = null;
    }



    for (const key of Array.from(files.keys())) {
      if (files.get(key).partid != null) {
        const tmp = ('' + this.eservice.childProcess.execSync(this.mktemppath + ' ' + this.tmpfilepath)).replace('\n', '');
        tmpfiles.push(tmp);

        const promise1 = this.saveAttachmentContent(files.get(key).messageid, files.get(key).partid, tmp);
        promises.push(promise1);
        promise1.then(e1 => {
          attachs.push({
            filename: key.name,
            path: tmp
          });
        });
      } else if (files.get(key).icsdate != null) {
        const promise1 = new Promise((resolve, reject) => {
          const date1 = files.get(key).icsdate as Date;
          const time1 = files.get(key).icstime as Date;
          const uiid: string = uuid();
          let date2 = new Date(date1);

          if (!files.get(key).icsallday) {
            date1.setMinutes(time1.getMinutes());
            date1.setHours(time1.getHours());
            date2 = new Date(date1);
            date2.setMinutes(date1.getMinutes() + files.get(key).icsduraction);
          } else {
            date1.setMinutes(0);
            date1.setHours(0);
            date2.setMinutes(23);
            date2.setHours(59);
          }

          const dtstart = date1.toISOString().replace(/-/g, '').replace(/:/g, '').replace(/\./g, '').slice(0, -4) + 'Z';
          const dtend = date2.toISOString().replace(/-/g, '').replace(/:/g, '').replace(/\./g, '').slice(0, -4) + 'Z';
          const dtstamp = new Date(Date.now()).toISOString().replace(/-/g, '').replace(/:/g, '').replace(/\./g, '').slice(0, -4) + 'Z';

          let tosics = [];
          if (to.length > 0) {
            tosics = tosics.concat(to.split(','));
          }
          if (cc.length > 0) {
            tosics = tosics.concat(cc.split(','));
          }
          const icscontent = this.getICS(uiid, files.get(key).icstitre, dtstart, dtend, dtstamp, this.defautICSUser, this.defautEventMailInvit, tosics, 'id:' + files.get(key).messageid);
          icalEvents.push({
            filename: 'invitation.ics',
            method: 'request',
            content: icscontent.toString()
          });
          resolve();
        });
        promises.push(promise1);
      } else {
        promises.push(new Promise((resolve, reject) => {
          attachs.push({
            filename: key.name,
            path: files.get(key)
          });
          resolve();
        }));
      }
    }
    Promise.all(promises).then(values => {
      /*      if (bcc.length > 0) {
              bcc = bcc + ', barais@irisa.fr';
            } else {
              bcc = 'barais@irisa.fr';
            }*/
      let message = {};
      let icalEvent = null;
      if (icalEvents.length > 0) {
        icalEvent = icalEvents[0];
      }
      let signature = this.signatures.get(sender);
      if (signature === undefined) {
        signature = this.signatures.get(Array.from(this.signatures.keys())[0]);
      }
      let sentfolder = this.sendfolders.get(sender);
      if (sentfolder === undefined) {
        sentfolder = this.sendfolders.get(Array.from(this.sendfolders.keys())[0]);
      }
      let draftfolder = this.draftfolders.get(sender);
      if (draftfolder === undefined) {
        draftfolder = this.draftfolders.get(Array.from(this.draftfolders.keys())[0]);
      }


      let htmlwithsign = html;
      if (signature !== undefined && signature !== '') {
        htmlwithsign = html + '<BR>' + signature;
      }

      if (attachs.length > 0) {
        message = {
          from: sender,
          to: to,
          cc: cc,
          bcc: bcc,
          subject: subject,
          html: htmlwithsign,
          references: references,
          inReplyTo: inReplyTo,
          icalEvent: icalEvent,
          attachments: attachs,
          attachDataUrls: true
        };
      } else {
        message = {
          from: sender,
          to: to,
          cc: cc,
          bcc: bcc,
          subject: subject,
          references: references,
          inReplyTo: inReplyTo,
          // body: body,
          html: htmlwithsign,
          icalEvent: icalEvent,
          attachDataUrls: true
        };
      }
      let transport = this.transporters.get(sender);
      if (transport === undefined) {
        transport = this.transporters.get(Array.from(this.transporters.keys())[0]);
      }
      if (!isDraft) {
        transport.sendMail(message,
          (err) => {
            if (!err) {
              ret(true);
              /*              if (tmpfiles.length > 0) {
                              log.info('will delete ' + tmpfiles.join(' '));
                              this.execPromise('rm -f ' + tmpfiles.join(' ')).then(r => log.info('deleted ' + tmpfiles.join(' ')));
                            }*/
              this.draftsendtransporter.sendMail(message,
                (err2, info) => {
                  if (!err2) {
                    if (tmpfiles.length > 0) {
                      this.execPromise('rm -f ' + tmpfiles.join(' ')).then(r => log.info('deleted ' + tmpfiles.join(' ')));
                    }
                    const tmp = ('' + this.eservice.childProcess.execSync(this.mktemppath + ' ' + this.tmpfilepath)).replace('\n', '');
                    this.eservice.fs.writeFileSync(tmp, info.message, 'utf8');
                    this.eservice.childProcess.execSync(this.notmuchpath + ' insert --folder=' + sentfolder + ' -unread -new < ' + '\"' + tmp + '\"');
                    this.execPromise('rm -f ' + tmp).then(r => log.info('deleted ' + tmp));
                  } else {
                    log.error(err2);
                  }
                });
            } else {
              ret(false);
              this.draftsendtransporter.sendMail(message,
                (err1, info) => {
                  if (!err1) {
                    if (tmpfiles.length > 0) {
                      // log.info('will delete ' + tmpfiles.join(' '));
                      this.execPromise('rm -f ' + tmpfiles.join(' ')).then(r => log.info('deleted ' + tmpfiles.join(' ')));
                    }
                    const tmp = ('' + this.eservice.childProcess.execSync(this.mktemppath + ' ' + this.tmpfilepath)).replace('\n', '');
                    this.eservice.fs.writeFileSync(tmp, info.message, 'utf8');
                    this.eservice.childProcess.execSync(this.notmuchpath + ' insert --folder=' + this.defaultoutputfolder + ' --create-folder -unread -new < ' + '\"' + tmp + '\"');
                    // log.info('will delete ' + tmp);
                    this.execPromise('rm -f ' + tmp).then(r => log.info('deleted ' + tmp));
                  } else {
                    log.error(err1);
                  }
                });
              return;
              //              log.error(err);
            }
          });
      } else {
        this.draftsendtransporter.sendMail(message,
          (err, info) => {
            if (!err) {
              ret(true);
              //              log.info('Email send ...');
              if (tmpfiles.length > 0) {
                //                log.info('will delete ' + tmpfiles.join(' '));
                this.execPromise('rm -f ' + tmpfiles.join(' ')).then(r => log.info('deleted ' + tmpfiles.join(' ')));
              }
              const tmp = ('' + this.eservice.childProcess.execSync(this.mktemppath + ' ' + this.tmpfilepath)).replace('\n', '');
              this.eservice.fs.writeFileSync(tmp, info.message, 'utf8');
              this.eservice.childProcess.execSync(this.notmuchpath + ' insert --folder=' + draftfolder + ' -unread -new < ' + '\"' + tmp + '\"');
              // log.info('will delete ' + tmp);
              this.execPromise('rm -f ' + tmp).then(r => log.info('deleted ' + tmp));
            } else {
              ret(false);
              log.error(err);
            }
          });
      }
    });
  }

  saveAttachmentContent(messageid, attachmentid, dest): Promise<string> {
    return this.execPromise(this.notmuchpath + ' show --format=raw --entire-thread=false --part=' + attachmentid + ' \'id:' + messageid + '\' > ' + dest.replace(/ /g , '\\ ' ));
  }

  // notmuch reply --format=json --reply-to=sender id:1be0a9cd-7cfc-6ddc-d02c-1d8908dacf08@univ-rennes1.fr > git/notmychelectronreader/src/testdata/replyall.json
  reply(messageid: string): Promise<any> {
    const promise1 = new Promise<any>((resolve3, reject) => {
      const mail: any = {};
      //      log.info('/usr/bin/notmuch reply --format=json --reply-to=sender id:' + messageid);
      this.execPromise(this.notmuchpath + ' reply --format=json --reply-to=sender \'id:' + messageid + '\'').then(replyms => {
        const replym = JSON.parse(replyms);
        mail.subject = replym['reply-headers'].Subject;
        mail.from = replym['reply-headers'].From;
        mail.to = replym['reply-headers'].To;
        mail.inReplyTo = replym['reply-headers']['In-reply-to'];
        mail.references = replym['reply-headers']['References'];
        const dom = jsel(replym);
        const res = dom.selectAll('//*[@content-type="text/html"]/@id');
        if (res.length > 0) {
          const origi = dom.select('//*[headers]');
          mail.body = '<BR> <BR> On ' + new Date(origi.timestamp * 1000) + ', ' + origi.headers.From + 'wrote: <BR>';
          // console.log('pass par la');
          mail.body = mail.body + '<blockquote>';
          mail.body = mail.body + this.getHtml(origi.id);
          mail.text = this.getTextFromMessage(origi.id);
          mail.body = mail.body + '</bockquote>';
          // console.log(mail.body);
        } else {
          const origi = dom.select('//*[headers]');
          mail.body = '<BR> <BR> On ' + new Date(origi.timestamp * 1000) + ', ' + origi.headers.From + 'wrote: <BR>';
          mail.body = mail.body + '<blockquote>';
          mail.text = this.getTextPlain(origi.id);
          mail.body = mail.body + mail.text.replace(/\n/g, '<BR>');
          mail.body = mail.body + '</blockquote>';
        }
        resolve3(mail);
      });
    });
    return promise1;
  }
  forward(messageid: string): Promise<any> {
    const promise1 = new Promise<any>((resolve3, reject) => {
      const mail: any = {};
      // log.info(this.notmuchpath + ' reply --format=json --reply-to=sender id:' + messageid);
      this.execPromise(this.notmuchpath + ' reply --format=json --reply-to=sender \'id:' + messageid + '\'').then(replyms => {
        const replym = JSON.parse(replyms);
        mail.subject = replym['reply-headers'].Subject;
        mail.from = replym['reply-headers'].From;
        const dom = jsel(replym);
        const res = dom.selectAll('//*[@content-type="text/html"]/@id');
        if (res.length > 0) {
          const origi = dom.select('//*[headers]');
          mail.body = '<BR> <BR> On ' + new Date(origi.timestamp * 1000) + ', ' + origi.headers.From + 'wrote: <BR>';
          mail.body = mail.body + '<blockquote>';
          mail.body = mail.body + this.getHtml(origi.id);
          mail.body = mail.body + '</blockquote>';
          mail.text = this.getTextFromMessage(origi.id);

        } else {
          const origi = dom.select('//*[headers]');
          mail.body = '<BR> <BR> On ' + new Date(origi.timestamp * 1000) + ', ' + origi.headers.From + 'wrote: <BR>';
          mail.body = mail.body + '<blockquote>';
          mail.text = this.getTextPlain(origi.id);
          mail.body = mail.body + mail.text.replace(/\n/g, '<BR>');
          mail.body = mail.body + '</blockquote>';
        }
        mail.references = replym['reply-headers']['References'];
        const res1 = dom.selectAll('//*[@content-disposition="attachment"]');
        mail.attachments = [];
        res1.forEach(e => {
          mail.attachments.push({
            messageid: messageid,
            partid: e.id,
            name: e.filename,
            size: e['content-length'],
            ct: e['content-type']
          });
        });
        resolve3(mail);
      });
    });
    return promise1;
  }

  createICSMessage(messageid: string, icstitre: string, icsdate: Date, icstime: Date, icsduraction: number, icsallday: boolean): Promise<any> {
    const promise1 = new Promise<any>((resolve3, reject) => {
      const mail: any = {};
      // log.info(this.notmuchpath + ' reply --format=json --reply-to=sender id:' + messageid);
      this.execPromise(this.notmuchpath + ' reply --format=json --reply-to=sender id:\'' + messageid + '\'').then(replyms => {
        const replym = JSON.parse(replyms);
        mail.subject = replym['reply-headers'].Subject;
        mail.from = replym['reply-headers'].From;
        mail.defaultto = this.defautICSUser + ' <' + this.defautEventMailCalendar + '>';
        mail.references = replym['reply-headers']['References'];
        const dom = jsel(replym);
        const res = dom.selectAll('//*[@content-type="text/html"]/@id');
        if (res.length > 0) {
          const origi = dom.select('//*[headers]');
          mail.body = '<BR> <BR> On ' + new Date(origi.timestamp * 1000) + ', ' + origi.headers.From + 'wrote: <BR>';
          mail.body = mail.body + this.getHtml(origi.id);
          mail.text = this.getTextFromMessage(origi.id);

        } else {
          const origi = dom.select('//*[headers]');
          mail.body = '<BR> <BR> On ' + new Date(origi.timestamp * 1000) + ', ' + origi.headers.From + 'wrote: <BR>';
          mail.text = this.getTextPlain(origi.id);
          mail.body = mail.body + mail.text.replace(/\n/g, '<BR>');

        }
        mail.references = replym['reply-headers']['References'];
        mail.attachments = [];
        mail.attachments.push({
          messageid: messageid,
          icstitre: icstitre,
          icsdate: icsdate,
          icstime: icstime,
          icsduraction: icsduraction,
          icsallday: icsallday,
          name: 'meeting.ics',
          size: 1024,
          ct: 'text/calendar'
        });
        resolve3(mail);
      });
    });
    return promise1;
  }

  editAsNew(messageid: string): Promise<any> {
    const promise1 = new Promise<any>((resolve3, reject) => {
      const mail: any = {};
      this.execPromise(this.notmuchpath + ' show --format=json ' + ' --include-html' + ' --entire-thread=' + false + ' \'id:' + messageid + '\'').then(replyms => {
        // log.info(replyms);
        const dom1 = jsel(JSON.parse('' + replyms));
        const m = dom1.selectAll('//*[headers]') as Mail[];
        if (m.length > 0) {
          const mail1 = m[0];
          // const replym = JSON.parse(replyms);
          mail.subject = mail1.headers.Subject;
          mail.from = mail1.headers.From;
          mail.cc = mail1.headers.Cc;
          mail.to = mail1.headers.To;
          mail.bcc = mail1.headers.Bcc;

          const dom = jsel(mail1);
          const res = dom.selectAll('//*[@content-type="text/html"]/@id');
          if (res.length > 0) {
            mail.body = dom.select('//*[@content-type="text/html"]/@content');
            const root = $($.parseHTML(mail.body));
            mail.text = $('<div></div>').append(root.clone()).text();

          } else {
            mail.body = dom.select('//*[@content-type="text/plain"]/@content').replace(/\n/g, '<BR>');
            mail.text = mail.body;
          }
          const res1 = dom.selectAll('//*[@content-disposition="attachment"]');
          mail.attachments = [];
          res1.forEach(e => {
            mail.attachments.push({
              messageid: messageid,
              partid: e.id,
              name: e.filename,
              size: e['content-length'],
              ct: e['content-type']
            });
          });
          resolve3(mail);
        }
      });
    });
    return promise1;
  }

  replyAll(messageid: string): Promise<any> {
    const promise1 = new Promise<any>((resolve3, reject) => {
      const mail: any = {};
      this.execPromise(this.notmuchpath + ' reply --format=json --reply-to=all \'id:' + messageid + '\'').then(replyallms => {
        const replyallm = JSON.parse(replyallms);
        mail.subject = replyallm['reply-headers'].Subject;
        mail.from = replyallm['reply-headers'].From;
        mail.to = replyallm['reply-headers'].To;
        mail.cc = replyallm['reply-headers'].Cc;
        mail.inReplyTo = replyallm['reply-headers']['In-reply-to'];
        mail.references = replyallm['reply-headers']['References'];

        const dom = jsel(replyallm);
        const res = dom.selectAll('//*[@content-type="text/html"]/@id');
        if (res.length > 0) {
          const origi = dom.select('//*[headers]');
          mail.body = '<BR> <BR> On ' + new Date(origi.timestamp * 1000) + ', ' + origi.headers.From + 'wrote: <BR>';
          mail.body = mail.body + '<blockquote>';
          mail.body = mail.body + this.getHtml(origi.id);
          mail.body = mail.body + '</blockquote>';
          mail.text = this.getTextFromMessage(origi.id);

        } else {
          const origi = dom.select('//*[headers]');
          mail.body = '<BR> <BR> On ' + new Date(origi.timestamp * 1000) + ', ' + origi.headers.From + 'wrote: <BR>';
          mail.body = mail.body + '<blockquote>';
          mail.text = this.getTextPlain(origi.id);
          mail.body = mail.body + mail.text.replace(/\n/g, '<BR>');
          mail.body = mail.body + '</blockquote>';

        }
        resolve3(mail);
      });
    });
    return promise1;
  }


  getHtmlFromMessage(message: Mail): string {
    const dom = jsel(message);
    const html = dom.select('//*[@content-type="text/html"]/@content');
    const calendar = dom.select('//*[@content-type="text/calendar"]/@content');
    const root = $($.parseHTML(html));
    root.find('img').each((index, img) => {
      if (img.src.startsWith('cid:')) {
        const cid = img.src.substring(4, img.src.length);
        const inline = message.inlines.find(e => {
          return e['content-id'] === cid;
        });
        if (inline !== undefined) {
          // console.log('data:' + inline['content-type'] + ';base64,' + inline);
          img.src = 'data:' + inline['content-type'] + ';base64,' + inline.content;
        }
      }
    });
    let res = $('<div></div>').append(root.clone()).html();
    res = this.sanitizer.sanitize(SecurityContext.HTML, res);

    if (calendar != null) {
      const jcalData = this.ICAL.parse(calendar);
      const comp = new this.ICAL.Component(jcalData);
      const vevent = comp.getFirstSubcomponent('vevent');
      const summary = vevent.getFirstPropertyValue('summary');
      const dtstart = vevent.getFirstPropertyValue('dtstart');
      const dtend = vevent.getFirstPropertyValue('dtend');
      const organizer = vevent.getFirstPropertyValue('organizer');
      res = res + '<BR><b>summary</b>: ' + summary + '<BR><b>start</b>: ' + dtstart +
      '<BR><b>end</b>: ' + dtend +
      '<BR><b>organizer</b>: ' + organizer;
      res = res + '<BR><BR>' + calendar;

    }

    //    res = this.sanitizer.sanitize(SecurityContext.SCRIPT, res);
    //    res = this.sanitizer.sanitize(SecurityContext.STYLE, res);
    return res;

  }

  getTextFromMessage(messageid): string {
    const stdout = this.eservice.childProcess.execSync(this.notmuchpath + ' show --format=json' + ' --include-html' + ' --entire-thread=' + false + ' ' + '\'id:' + messageid + '\'');
    const dom = jsel(JSON.parse(`${stdout}`));
    const html = dom.select('//*[@content-type="text/html"]/@content');
    const root = $($.parseHTML(html));
    const res = $('<div></div>').append(root.clone()).text();
    return res;

  }


  getHtml(messageid): string {
    const stdout = this.eservice.childProcess.execSync(this.notmuchpath + ' show --format=json' + ' --include-html' + ' --entire-thread=' + false + ' ' + '\'id:' + messageid + '\'');
    const dom = jsel(JSON.parse(`${stdout}`));
    const message = dom.select('//*[headers]') as Mail;
    const inlines = dom.selectAll('//*[@content-disposition="inline"]');
    message.inlines = [];
    inlines.forEach(e => {
      //  notmuch show --part=5  --entire-thread=false --format=raw id:080326cc-9b0c-9824-c2eb-7a4ac3bf48d6@2PE-bretagne.eu | base64 -w 0
      const contentbase64 = '' + this.eservice.childProcess.execSync(this.notmuchpath + ' show --part=' + e.id + ' --entire-thread=false --format=raw \'id:' + message.id + '\' | ' + this.base64path + ' -w 0');
      //          console.log(this.notmuchpath + ' show --part=' + e.id + ' --entire-thread=false --format=raw \'id:' +  message.id + '\' | ' + this.base64path + ' -w 0');
      //          console.log('base64 ' + contentbase64);
      message.inlines.push({
        messageid: message.id,
        partid: e.id,
        name: e.filename,
        'content-id': e['content-id'],
        'content-type': e['content-type'],
        content: contentbase64
      });
    });
    return this.getHtmlFromMessage(message);

    //    return dom.select('//*[@content-type="text/html"]/@content');
  }
  getTextPlain(messageid): string {
    const stdout = this.eservice.childProcess.execSync(this.notmuchpath + ' show --format=json' + ' --include-html' + ' --entire-thread=' + false + ' ' + '\'id:' + messageid + '\'');
    const dom1 = jsel(JSON.parse(`${stdout}`));
    return dom1.select('//*[@content-type="text/plain"]/@content');
  }


  flushOutBox() {
    const stdout = this.eservice.childProcess.execFileSync(this.notmuchpath, ('search --exclude=true --format=json' + ' path:' + this.defaultoutputfolder +  '/**').split(' '));
    const ts = (<Thread[]>JSON.parse(`${stdout}`));
    log.info('nb message in outbox = ' + ts.length);
    ts.forEach(t => {
      const stdout1 = this.eservice.childProcess.execSync(this.notmuchpath + ' show --format=json' + ' --include-html' + ' --entire-thread=' + false + ' \'' + t.query[0] + '\'');
      const dom1 = jsel(JSON.parse('' + stdout1));
      const m = dom1.selectAll('//*[headers]') as Mail[];
      m.forEach(message => {
        const dom = jsel(message);
        message.attachments = [];
        const res = dom.selectAll('//*[@content-disposition="attachment"]');
        res.forEach(e => {
          message.attachments.push({
            messageid: message.id,
            partid: e.id,
            name: e.filename,
            size: e['content-length'],
            ct: e['content-type']
          });
        });
      });
      m.forEach(message => {
        const attachs = [];
        const promises = [];
        const tmpfiles = [];
        message.attachments.forEach(attach => {
          const tmp = ('' + this.eservice.childProcess.execSync(this.mktemppath + ' ' + this.tmpfilepath)).replace('\n', '');
          tmpfiles.push(tmp);
          const promise1 = this.saveAttachmentContent(attach.messageid, attach.partid, tmp);
          promises.push(promise1);
          promise1.then(e1 => {
            attachs.push({
              filename: attach.name,
              path: tmp
            });
          });
        });
        Promise.all(promises).then(values => {
          /*      if (bcc.length > 0) {
                  bcc = bcc + ', barais@irisa.fr';
                } else {
                  bcc = 'barais@irisa.fr';
                }*/
          const dom = jsel(message);

          const res = dom.selectAll('//*[@content-type="text/html"]/@id');
          let body = '';
          if (res.length > 0) {
            body = dom.select('//*[@content-type="text/html"]/@content');
          } else {
            body = dom.select('//*[@content-type="text/plain"]/@content').replace(/\n/g, '<BR>');
          }
          // log.info('body ' + body);
          let message1 = {};
          if (attachs.length > 0) {
            message1 = {
              from: message.headers.From,
              to: message.headers.To,
              cc: message.headers.Cc,
              bcc: message.headers.Bcc,
              subject: message.headers.Subject,
              references: message.headers.References,
              inReplyTo: message.headers.InReplyTo,
              html: body,
              attachments: attachs
            };
          } else {
            message1 = {
              from: message.headers.From,
              to: message.headers.To,
              cc: message.headers.Cc,
              bcc: message.headers.Bcc,
              subject: message.headers.Subject,
              references: message.headers.References,
              inReplyTo: message.headers.InReplyTo,
              // body: body,
              html: body
            };
          }
          log.info(message1);
          let transport = this.transporters.get(message.headers.From);
          if (transport === undefined) {
            transport = this.transporters.get(Array.from(this.transporters.keys())[0]);
          }
          let sentfolder = this.sendfolders.get(message.headers.From);
          if (sentfolder === undefined) {
            sentfolder = this.sendfolders.get(Array.from(this.sendfolders.keys())[0]);
          }

          transport.sendMail(message1,
            (err) => {
              if (!err) {
                /*              if (tmpfiles.length > 0) {
                                log.info('will delete ' + tmpfiles.join(' '));
                                this.execPromise('rm -f ' + tmpfiles.join(' ')).then(r => log.info('deleted ' + tmpfiles.join(' ')));
                              }*/
                this.addTag(['id:' + message.id], 'deleted');
                this.draftsendtransporter.sendMail(message,
                  (err2, info) => {
                    if (!err2) {
                      if (tmpfiles.length > 0) {
                        this.execPromise('rm -f ' + tmpfiles.join(' ')).then(r => log.info('deleted ' + tmpfiles.join(' ')));
                      }
                      const tmp = ('' + this.eservice.childProcess.execSync(this.mktemppath + ' ' + this.tmpfilepath)).replace('\n', '');
                      this.eservice.fs.writeFileSync(tmp, info.message, 'utf8');
                      this.eservice.childProcess.execSync(this.notmuchpath + ' insert --folder=' + sentfolder + ' -unread -new < ' + '\"' + tmp + '\"');
                      this.execPromise('rm -f ' + tmp).then(r => log.info('deleted ' + tmp));
                    } else {
                      log.error(err2);
                    }
                  });
              } else {
                console.log('Cannot send email (no connexion) ...');
                if (tmpfiles.length > 0) {
                  this.execPromise('rm -f ' + tmpfiles.join(' ')).then(r => log.info('deleted ' + tmpfiles.join(' ')));
                }
              }

            });
        });

      }
      );

    }

    );

  }

  private getICS(uid, summary, dtstart, dtend, dtstamp, organizername, organizermail, attendees: string[], description) {
    let attendString = '';
    attendees.forEach(attendee => {
      let emailcheck = attendee.trim();
      let attendeename: string;
      let attendeemail: string;
      if (attendee.includes('<')) {
        emailcheck = attendee.slice(attendee.indexOf('<') + 1, attendee.indexOf('>'));
        attendeename = attendee.slice(0, attendee.indexOf('<') - 1);
        attendeemail = emailcheck;
      } else {
        attendeename = emailcheck;
        attendeemail = emailcheck;
      }
      attendString = attendString + this.getAttendee(attendeename, emailcheck) + '\n';
    });



    return `BEGIN:VCALENDAR
PRODID:Zimbra-Calendar-Provider
VERSION:2.0
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
SUMMARY:${summary}
PRIORITY:5
X-MICROSOFT-CDO-APPT-SEQUENCE:0
X-MICROSOFT-CDO-BUSYSTATUS:TENTATIVE
X-MICROSOFT-CDO-IMPORTANCE:1
X-MICROSOFT-CDO-INSTTYPE:0
ORGANIZER;CN=${organizername};SENT-BY="mailto:${organizermail}":mailto:${organizermail}
DTSTART:${dtstart}
DTEND:${dtend}
STATUS:CONFIRMED
CLASS:PUBLIC
X-MICROSOFT-CDO-INTENDEDSTATUS:BUSY
TRANSP:OPAQUE
DTSTAMP:${dtstamp}
SEQUENCE:0
${attendString}DESCRIPTION:${description}
BEGIN:VALARM
ACTION:DISPLAY
TRIGGER;RELATED=START:-PT10M
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;
  }

  getAttendee(attendeename, attendeemail) {
    return `ATTENDEE;CN=${attendeename};PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendeemail}`;

  }
  isElectron = () => {
    return window && window.process && window.process.type;
  }

  initIdle(refresh1: () => any) {
    this.imap1 = new imap({
      user: this.user,
      password: this.password,
      host: this.host,
      port: this.port,
      tls: this.tls,
      connTimeout: 10000,
      authTimeout: 10000,
      debug: null,
      tlsOptions: {}
    });
    this.refresh = refresh1;

    this.imap1.once('ready', this.imapReady.bind(this));
    this.imap1.once('close', this.imapClose.bind(this));
    this.imap1.on('error', this.imapError.bind(this));

  }

  start() {
    this.imap1.connect();
  }

  stop() {
    this.imap1.disconnect();
  }

  imapReady() {
    this.imap1.openBox(this.mailbox, false, (error, mailbox) => {
      if (error) {
        this.imapError(error);
      } else {
        const listener = this.imapMail.bind(this);
        this.imap1.on('mail', listener);
        this.imap1.on('update', listener);
      }
    });
  }

  imapClose() {

  }

  imapError(error) {

  }

  imapMail() {
    console.log('new mail')
    this.refresh();
  }

}

