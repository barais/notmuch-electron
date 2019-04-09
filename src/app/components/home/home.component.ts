import { Component, OnInit, Inject, ViewChild, ElementRef, AfterViewInit, Renderer2, SecurityContext } from '@angular/core';
import { MenuItem, ConfirmationService } from 'primeng/primeng';
import { SelectItem } from 'primeng/primeng';
import { TreeNode } from 'primeng/api';
import { MessageService } from 'primeng/api';
import Thread from '../../thread';
import { Mail } from '../../mail';

import jsel from 'jsel';

import { DOCUMENT, DomSanitizer } from '@angular/platform-browser';
import { HotkeysService, Hotkey } from 'angular2-hotkeys';
import { NotMuchService } from '../../not-much.service';
import { RtmService } from '../../rtm.service';
import { ElectronService } from '../../providers/electron.service';
import { shell } from 'electron';
import { SpellCheckHandler, ContextMenuListener, ContextMenuBuilder } from 'electron-spellchecker';
import 'rxjs/add/observable/merge';


// import { NotMuchServiceMock } from '../../not-much.service.mock';


const Keys = {
  TAB: 9,
  ENTER: 13,
  ESCAPE: 27,
  SPACE: 33,
  UP: 38,
  DOWN: 40,
};


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit {

  @ViewChild('editor') editorel: ElementRef;
  @ViewChild('to', { read: ElementRef }) private autoCompleteTo: ElementRef;
  @ViewChild('cc', { read: ElementRef }) private autoCompleteCc: ElementRef;
  @ViewChild('bcc', { read: ElementRef }) private autoCompleteBcc: ElementRef;
  @ViewChild('mailcontent', { read: ElementRef }) private mailContent: ElementRef;

  enCalendar: any = {
    firstDayOfWeek: 1,
    // tslint:disable-next-line:quotemark
    dayNames: ['Sunday', "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    // tslint:disable-next-line:quotemark
    dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    // tslint:disable-next-line:quotemark
    dayNamesMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    // tslint:disable-next-line:quotemark
    monthNames: ["January", "February", "March", "April", "May",
      // tslint:disable-next-line:quotemark
      "June", "July", "August", "September", "October", "November", "December"],
    // tslint:disable-next-line:quotemark
    monthNamesShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    // tslint:disable-next-line:quotemark
    today: 'Today',
    clear: 'Clear',
    dateFormat: 'mm/dd/yy'
  };


  froms: SelectItem[];
  query = 'path:IRISA/INBOX/**';
  items: MenuItem[];
  extras: MenuItem[];
  messageAction: MenuItem[];
  fromMessage = 1;
  toMessage = 50;
  nbThreads = 1245;
  filesTree2: TreeNode[];
  selectedFile: TreeNode;
  display = false;
  threads: Thread[];
  sortOptions: SelectItem[];
  sortKey: string;
  sortField: string;

  sortOrder: number;

  selectedThread: Thread;

  viewmaildetail: boolean;
  messages: Mail[];
  selectmatch = '';
  tag = '';
  addtagvalue: boolean;

  writeemail = false;
  from = '';
  tos = [];
  ccs = [];
  bccs = [];
  subject = '';
  mailbody = '';
  uploadedFiles: any[] = [];
  uploadFilesMap: Map<any, any> = new Map();
  mailreference: string;
  mailinReplyTo: string;


  // Code completion
  resultsto: string[];
  resultscc: string[];
  resultsbcc: string[];


  // Code completion
  resultresearch: any[] = [];


  selectedThreads: string[] = [];

  allThread = false;
  showSpamTrash = false;
  elem;
  interval;
  chronological = false;





  // Send ICS
  ics = false;
  icstitre = '';
  icsdate: Date;
  icstime: Date;
  icsduraction = 90;
  icsallday = false;
  icsmessage;

  // Task
  task = false;
  tasktitre: string;
  taskdate: Date;
  taskmessage;


  //  Spell check
  electronSpellchecker;
  SpellCheckHandler;
  ContextMenuListener;
  ContextMenuBuilder;


  constructor(private messageService: MessageService,
    @Inject(DOCUMENT) private document: any,
    private _hotkeysService: HotkeysService,
    private sanitizer: DomSanitizer,
    private notmuchService: NotMuchService,
    protected rtmservice: RtmService,
    private confirmationService: ConfirmationService,
    private eservice: ElectronService) {
    if (this.isElectron()) {
      this.electronSpellchecker = window.require('electron-spellchecker');
      this.SpellCheckHandler = this.electronSpellchecker.SpellCheckHandler;
      this.ContextMenuListener = this.electronSpellchecker.ContextMenuListener;
      this.ContextMenuBuilder = this.electronSpellchecker.ContextMenuBuilder;
    }


  }

  ngOnInit() {
    window.spellCheckHandler = new this.SpellCheckHandler();
    setTimeout(() => window.spellCheckHandler.attachToInput(), 1000);
    window.spellCheckHandler.switchLanguage('fr-FR');
    window.spellCheckHandler.autoUnloadDictionariesOnBlur();

    window.contextMenuBuilder = new this.ContextMenuBuilder(window.spellCheckHandler, null, true);
    window.contextMenuListener = new this.ContextMenuListener((info) => {
      if (info.isEditable) {
        window.contextMenuBuilder.showPopupMenu(info);
      }
    });

    this.elem = document.documentElement;

    this.notmuchService.shortcutqueries.forEach(short => {
      this._hotkeysService.add(new Hotkey(short.shortcut, (event: KeyboardEvent): boolean => {
        this.query = short.query;
        this.display = false;
        this.fromMessage = 1;
        this.toMessage = 50;
        this.update();
        return false;
      }));
    });

    this._hotkeysService.add(new Hotkey('f11', (event: KeyboardEvent): boolean => {
      this.openFullscreen();
      return false;
    }));

    this._hotkeysService.add(new Hotkey('* a', (event: KeyboardEvent): boolean => {
      this.selectAll();
      return false;
    }));

    this._hotkeysService.add(new Hotkey('esc', (event: KeyboardEvent): boolean => {
      this.closeFullscreen();
      return false;
    }));
    this.from = this.notmuchService.defautEventMailInvit;
    this.query = this.notmuchService.defaultquery;

    this.froms = [];
    this.notmuchService.getFroms().forEach(e1 => {
      this.froms.push({ label: e1, value: e1 });

    });

    this.filesTree2 = this.notmuchService.getMailFolder();
    this.notmuchService.getThread(this.query, 0, 50, (th) => {
      // this.threads.concat(th);
      this.threads = [...th];
    });

    this.notmuchService.countAllThread(this.query).subscribe(v => this.nbThreads = v);
    this.messageAction = [
      {
        label: 'None', icon: 'far fa-minus-square', command: () => {
          this.selectNone();
        }
      },
      {
        label: 'Read', icon: 'fas fa-comment', command: () => {
          this.selectRead();
        }
      },
      {
        label: 'Unread', icon: 'far fa-comment', command: () => {
          this.selectUnread();
        }
      },
      {
        label: 'Starred', icon: 'fas fa-star', command: () => {
          this.selectStar();
        }
      },
      {
        label: 'Unstarred', icon: 'far fa-star', command: () => {
          this.selectUnstarred();
        }
      },

    ];
    this.extras = [
      {
        label: 'Mark as read', icon: 'fas fa-comment', command: () => {
          this.markAsRead();
        }
      },
      {
        label: 'Mark as Unread', icon: 'far fa-comment', command: () => {
          this.markAsUnread();
        }
      },
      {
        label: 'Mark as star', icon: 'fas fa-star', command: () => {
          this.markAsStar();
        }
      },
      {
        label: 'Mark as Unstarred', icon: 'far fa-star', command: () => {
          this.markAsUnstarred();
        }
      },


      {
        label: 'Add new tags', icon: 'pi pi-times', command: () => {
          this.addtagvalue = true;
        }
      },
      { label: 'Move to a folder', icon: 'pi pi-refresh', disabled: true },
      {
        label: 'Copy selected id', icon: 'pi pi-refresh', command: () => {
          this.copyIds();
        }
      },
    ];
    this.interval = setInterval(() => this.updateSync(), 60 * 1000);



    //    clearInterval(x);
  }

  updateSync() {
    if (!this.writeemail && !this.viewmaildetail && this.selectedThread == null) {
      this.update();
    }

  }

  ngAfterViewInit() {
    //    this.editorel.el.nativeElement.focus();
  }

  onEditorInit(event: any) {
    console.log(event.editor);
    event.editor.root.focus();
  }


  openFullscreen() {
    if (this.elem.requestFullscreen) {
      this.elem.requestFullscreen();
    } else if (this.elem.mozRequestFullScreen) {
      /* Firefox */
      this.elem.mozRequestFullScreen();
    } else if (this.elem.webkitRequestFullscreen) {
      /* Chrome, Safari and Opera */
      this.elem.webkitRequestFullscreen();
    } else if (this.elem.msRequestFullscreen) {
      /* IE/Edge */
      this.elem.msRequestFullscreen();
    }
  }

  /* Close fullscreen */
  closeFullscreen() {
    if (this.document.exitFullscreen) {
      this.document.exitFullscreen();
    } else if (this.document.mozCancelFullScreen) {
      /* Firefox */
      this.document.mozCancelFullScreen();
    } else if (this.document.webkitExitFullscreen) {
      /* Chrome, Safari and Opera */
      this.document.webkitExitFullscreen();
    } else if (this.document.msExitFullscreen) {
      /* IE/Edge */
      this.document.msExitFullscreen();
    }
  }


  canBeEditAsNew(message) {
    if (message == null || message.headers == null || message.headers.From == null) {
      return false;
    } else {
      return this.froms.some(e => message.headers.From.toLowerCase().includes(e.value.toLowerCase()));
    }
  }
  /*
  var reader = new FileReader();
  reader.onload = (function() { return function(e) { console.log( e.target.result); }; })();
  reader.readAsDataURL(file);
*/
  myUploader(event, upload) {
    for (const file of event.files) {
      console.log(event.files.length);
      console.log(this.uploadedFiles.length);
      if (!this.uploadedFiles.includes(file)) {
        this.uploadedFiles.push(file);
        const reader = new FileReader();
        reader.onload = (() => {
          return (e) => {
            this.uploadFilesMap.set(file, e.target.result);
          };
        })();
        reader.readAsDataURL(file);
      }
    }

    upload.clear();

    this.messageService.add({ severity: 'info', summary: 'File Uploaded', detail: '' });
  }


  deleteAttachement(file) {
    this.uploadedFiles = this.uploadedFiles.filter(item => item !== file);
    this.uploadFilesMap.delete(file);
  }

  searchto(event) {
    this.notmuchService.getMailAddress(event.query).subscribe(res => {
      // tslint:disable-next-line:max-line-length
      const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      let validadress = true;
      let emailcheck = event.query.trim();
      if (event.query.includes('<')) {
        emailcheck = event.query.slice(event.query.indexOf('<') + 1, event.query.indexOf('>')).trim();
      }
      validadress = validadress && re.test(emailcheck);
      if (validadress) {
        res.push(event.query.trim());
      }
      this.resultsto = res;
    });
  }

  searchcc(event) {
    this.notmuchService.getMailAddress(event.query).subscribe(res => {
      // tslint:disable-next-line:max-line-length
      const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      let validadress = true;
      let emailcheck = event.query.trim();
      if (event.query.includes('<')) {
        emailcheck = event.query.slice(event.query.indexOf('<') + 1, event.query.indexOf('>')).trim();
      }
      validadress = validadress && re.test(emailcheck);
      if (validadress) {
        res.push(event.query.trim());
      }
      this.resultscc = res;
    });
  }
  searchbcc(event) {
    this.notmuchService.getMailAddress(event.query).subscribe(res => {
      // tslint:disable-next-line:max-line-length
      const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      let validadress = true;
      let emailcheck = event.query.trim();
      if (event.query.includes('<')) {
        emailcheck = event.query.slice(event.query.indexOf('<') + 1, event.query.indexOf('>')).trim();
      }
      validadress = validadress && re.test(emailcheck);
      if (validadress) {
        res.push(event.query.trim());
      }
      this.resultsbcc = res;
    });
  }

  searchquery(event) {
    const terms = event.query.split(' ');
    if (terms[terms.length - 1].startsWith('from:')) {
      const mail = terms[terms.length - 1].substring(5, terms[terms.length - 1].length);
      this.notmuchService.getMailAddress(mail).subscribe(res => {
        this.resultresearch = [];
        res.forEach(d => {
          this.resultresearch.push(event.query.substring(0, event.query.length - mail.length) + d);
        });
      });
    }
    if (terms[terms.length - 1].startsWith('to:')) {
      const mail = terms[terms.length - 1].substring(3, terms[terms.length - 1].length);
      this.notmuchService.getMailAddress(mail).subscribe(res => {
        this.resultresearch = [];
        res.forEach(d => {
          this.resultresearch.push(event.query.substring(0, event.query.length - mail.length) + d);
        });
      });
    }
    if (terms[terms.length - 1].startsWith('cc:')) {
      const mail = terms[terms.length - 1].substring(3, terms[terms.length - 1].length);
      this.notmuchService.getMailAddress(mail).subscribe(res => {
        this.resultresearch = [];
        res.forEach(d => {
          this.resultresearch.push(event.query.substring(0, event.query.length - mail.length) + d);
        });
      });
    }
    if (terms[terms.length - 1].startsWith('tag:')) {
      const tag = terms[terms.length - 1].substring(4, terms[terms.length - 1].length);
      this.notmuchService.getTags((res) => {
        this.resultresearch = [];
        res.filter(d => d.startsWith(tag)).forEach(d => {
          this.resultresearch.push(event.query.substring(0, event.query.length - tag.length) + d);
        });
      }
      );
    }
    if (terms[terms.length - 1].startsWith('path:')) {
      const tag = terms[terms.length - 1].substring(5, terms[terms.length - 1].length);
      const res = this.notmuchService.getDirectories(this.notmuchService.localmailfolder);
      let filter = tag;
      if (this.notmuchService.localmailfoldermultiaccounts) {
        filter = filter.replace('/', '.');
      }
      this.resultresearch = [];
      res.filter(d => d.startsWith(filter)).forEach(d => {
        let dfilter = d;
        if (this.notmuchService.localmailfoldermultiaccounts) {
          dfilter = dfilter.replace('.', '/');
        }
        this.resultresearch.push(event.query.substring(0, event.query.length - tag.length) + dfilter + '/**');
      });

    }

    if (terms[terms.length - 1].startsWith('-tag:')) {
      const tag = terms[terms.length - 1].substring(5, terms[terms.length - 1].length);
      this.notmuchService.getTags((res) => {
        this.resultresearch = [];
        res.filter(d => d.startsWith(tag)).forEach(d => {
          this.resultresearch.push(event.query.substring(0, event.query.length - tag.length) + d);
        });
      }
      );
    }
  }

  toICS(event, m) {
    event.stopPropagation();
    event.preventDefault();
    this.ics = true;
    this.icstitre = m.headers.Subject;
    this.icsmessage = m;
  }



  convertTask(event, m) {
    event.stopPropagation();
    event.preventDefault();
    this.task = true;
    this.tasktitre = m.headers.Subject;
    this.taskmessage = m;

  }
  sendICS() {
    this.ics = false;
    this.notmuchService.createICSMessage(this.icsmessage.id, this.icstitre,
      this.icsdate, this.icstime, this.icsduraction, this.icsallday).then(obj => {
        this.from = obj.from;
        this.subject = obj.subject.replace('Re:', '');
        console.log('test' + obj.defaultto);
        this.tos.push(obj.defaultto);
        this.mailbody = ''; // obj.body;
        obj.attachments.forEach(e => {
          const byteArray = new Uint8Array(e.size);
          for (let x = 0; x < byteArray.length; x++) {
            byteArray[x] = parseInt('0', 16);
          }
          const f = new File([byteArray], e.name, { type: e.ct });

          this.uploadFilesMap.set(f, {
            messageid: e.messageid,
            icstitre: e.icstitre,
            icsdate: e.icsdate,
            icstime: e.icstime,
            icsduraction: e.icsduraction,
            icsallday: e.icsallday,
            name: e.name,
            size: e.size,
            ct: e.ct
          });
          this.uploadedFiles.push(f);
        });
        this.icstitre = '';
        this.icsdate = new Date(Date.now());
        this.icstime = new Date(Date.now());
        this.icsduraction = 90;
        this.icsallday = false;
        this.icsmessage = null;
        this.writeemail = true;
      });
  }


  reply(event, m) {
    event.stopPropagation();
    event.preventDefault();
    this.notmuchService.reply(m.id).then(obj => {
      this.from = obj.from;
      if (obj.to != null) {
        const tos = obj.to.split(',');
        this.tos = [];
        let mailadress = '';
        let mailadresswithcomma = false;
        tos.forEach(mailadrr => {
          let count = 0;
          const matches = mailadrr.match(new RegExp('"', 'gi'));
          if (matches != null) {
            count = matches.length;
          }
          if (count === 0 || count > 1) {
            if (mailadresswithcomma) {
              mailadress = mailadress + mailadrr;
            } else {
              this.tos.push(mailadrr);
              console.log('ok');
            }
          } else {
            if (mailadresswithcomma) {
              mailadresswithcomma = !mailadresswithcomma;
              mailadress = mailadress + mailadrr;
              this.tos.push(mailadress);
              mailadress = '';
            } else {
              mailadresswithcomma = !mailadresswithcomma;
              mailadress = mailadress + mailadrr;
            }
          }
        });
      }
      this.subject = obj.subject;
      this.mailbody = obj.body;
      window.spellCheckHandler.provideHintText(obj.text);
      this.mailinReplyTo = obj.inReplyTo;
      this.mailreference = obj.references;
      this.writeemail = true;
    });

  }

  replyAll(event, m) {
    event.stopPropagation();
    event.preventDefault();
    this.notmuchService.replyAll(m.id).then(obj => {
      this.from = obj.from;
      if (obj.to != null) {
        const tos = obj.to.split(',');
        this.tos = [];
        let mailadress = '';
        let mailadresswithcomma = false;
        tos.forEach(mailadrr => {
          let count = 0;
          const matches = mailadrr.match(new RegExp('"', 'gi'));
          if (matches != null) {
            count = matches.length;
          }
          if (count === 0 || count > 1) {
            if (mailadresswithcomma) {
              mailadress = mailadress + mailadrr;
            } else {
              this.tos.push(mailadrr);
              console.log('ok');
            }
          } else {
            if (mailadresswithcomma) {
              mailadresswithcomma = !mailadresswithcomma;
              mailadress = mailadress + mailadrr;
              this.tos.push(mailadress);
              mailadress = '';
            } else {
              mailadresswithcomma = !mailadresswithcomma;
              mailadress = mailadress + mailadrr;
            }
          }
        });
      }
      if (obj.cc != null) {
        const ccs = obj.cc.split(',');
        this.ccs = [];
        let mailadress = '';
        let mailadresswithcomma = false;
        ccs.forEach(mailadrr => {
          let count = 0;
          const matches = mailadrr.match(new RegExp('"', 'gi'));
          if (matches != null) {
            count = matches.length;
          }
          if (count === 0 || count > 1) {
            if (mailadresswithcomma) {
              mailadress = mailadress + mailadrr + ', ';
            } else {
              this.ccs.push(mailadrr);
              console.log('ok');
            }
          } else {
            if (mailadresswithcomma) {
              mailadresswithcomma = !mailadresswithcomma;
              mailadress = mailadress + mailadrr;
              this.ccs.push(mailadress);
              mailadress = '';
            } else {
              mailadresswithcomma = !mailadresswithcomma;
              mailadress = mailadress + mailadrr + ', ';
            }
          }
        });
      }
      this.subject = obj.subject;
      this.mailbody = obj.body;
      window.spellCheckHandler.provideHintText(obj.text);
      this.mailinReplyTo = obj.inReplyTo;
      this.mailreference = obj.references;
      this.writeemail = true;
    });
  }
  forward(event, m) {
    event.stopPropagation();
    event.preventDefault();
    this.notmuchService.forward(m.id).then(obj => {
      this.from = obj.from;
      this.subject = obj.subject.replace('Re:', 'Fwd:');
      this.mailbody = obj.body;
      window.spellCheckHandler.provideHintText(obj.text);
      this.mailreference = obj.references;

      obj.attachments.forEach(e => {
        const byteArray = new Uint8Array(e.size);
        for (let x = 0; x < byteArray.length; x++) {
          byteArray[x] = parseInt('0', 16);
        }
        const f = new File([byteArray], e.name, { type: e.ct });

        this.uploadFilesMap.set(f, {
          messageid: e.messageid,
          partid: e.partid,
          name: e.name,
          size: e.size,
          ct: e.ct
        });
        this.uploadedFiles.push(f);
      });
      this.writeemail = true;
    });

  }

  editAsNew(event, m) {
    event.stopPropagation();
    event.preventDefault();
    this.notmuchService.editAsNew(m.id).then(obj => {
      this.from = 'barais@irisa.fr';

      if (obj.to != null) {
        this.tos = obj.to.split(',');
      }
      if (obj.cc != null) {
        this.ccs = obj.cc.split(',');
      }
      if (obj.bcc != null) {
        this.bccs = obj.bcc.split(',');
      }
      this.subject = obj.subject;
      this.mailbody = obj.body;
      window.spellCheckHandler.provideHintText(obj.text);
      obj.attachments.forEach(e => {
        const byteArray = new Uint8Array(e.size);
        for (let x = 0; x < byteArray.length; x++) {
          byteArray[x] = parseInt('0', 16);
        }
        const f = new File([byteArray], e.name, { type: e.ct });

        this.uploadFilesMap.set(f, {
          messageid: e.messageid,
          partid: e.partid,
          name: e.name,
          size: e.size,
          ct: e.ct
        });
        this.uploadedFiles.push(f);
      });
      this.writeemail = true;
    });

  }


  newMail() {
    this.writeemail = true;
  }

  onMailShow() {
    // this.elem.nativeElement.focus();
    const editor = this.editorel as any;
    editor.quill.keyboard.addBinding({
      key: Keys.UP,
      shortKey: true
    }, (range, context) => {
      let text = '';
      if (range > 20) {
        text = editor.quill.getText(range.index - 20, 20);
      } else {
        text = editor.quill.getText(0, range.index);
      }



      const words = text.split(/,| |\n|;/);
      const word = words.pop();
      const match = this.notmuchService.shortcutmailtyping.find(e => e.shortcut === word);
      if (match !== undefined) {
        const deletesize = word.length ;
        const formula = '' + match.formula ;
        let d2 = {};
        if (range.index - word.length > 0) {
          d2 = {
          ops: [
            { retain: range.index - word.length},
            { delete : deletesize },
            {insert : formula}
          ]
        };
      } else {
        d2 = {
          ops: [
            { delete : deletesize },
            {insert : formula}
          ]
        };
      }
        editor.quill.updateContents(d2, 'user');
      }
    });

    editor.quill.keyboard.addBinding({
      key: Keys.TAB,
      shortKey: true
    }, (range, context) => {
      let text = '';
      text = editor.quill.getText(0, range.index);
      window.spellCheckHandler.provideHintText(text);
    });


    //    editor.quill.enable(false);
    // this.autoCompleteObject.focusInput();
    //    console.log(this.toel);
    this.autoCompleteTo.nativeElement.children[0].children[0].children[0].children[0].focus();
    //    this.toel.nativeElement.focus();
    // .domHandler.findSingle(this.toel.el.nativeElement, 'input').focus();

  }

  initRememberTheMilk(event) {
    event.stopPropagation();
    event.preventDefault();
    this.rtmservice.getURLApi().then(e => {
      console.log(e);
      shell.openExternal(e);
    });
    this.confirmationService.confirm({
      message: 'Did you accept the RTM rights for your app',
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.rtmservice.getAndSaveAuthToken().then().catch(e => {
          this.messageService.add({ severity: 'info', summary: 'Rejected', detail: 'Cannot connect to RTM' });
        });
        this.messageService.add({ severity: 'info', summary: 'Confirmed', detail: 'You can now use RTM' });
      },
      reject: () => {
        //        this.messageService.add({severity: 'info', summary: 'Rejected', detail: 'You have rejected'});
      }
    });
  }

  selectAll() {
    this.selectedThreads = this.threads.map(e => 'thread:' + e.thread);
    this.threads.forEach(e => { e.selected = true; });


  }
  selectRead() {
    this.selectNone();
    this.selectedThreads = this.threads.filter(e => !e.tags.includes('unread')).map(e => 'thread:' + e.thread);
    this.threads.filter(e => !e.tags.includes('unread')).forEach(e => { e.selected = true; });
  }

  selectUnread() {
    this.selectNone();
    this.selectedThreads = this.threads.filter(e => e.tags.includes('unread')).map(e => 'thread:' + e.thread);
    this.threads.filter(e => e.tags.includes('unread')).forEach(e => { e.selected = true; });
  }
  selectStar() {
    this.selectNone();
    this.selectedThreads = this.threads.filter(e => e.tags.includes('flagged')).map(e => 'thread:' + e.thread);
    this.threads.filter(e => e.tags.includes('flagged')).forEach(e => { e.selected = true; });
  }
  selectUnstarred() {
    this.selectNone();
    this.selectedThreads = this.threads.filter(e => !e.tags.includes('flagged')).map(e => 'thread:' + e.thread);
    this.threads.filter(e => !e.tags.includes('flagged')).forEach(e => { e.selected = true; });
  }

  selectMatched(event, s: string) {
    this.selectNone();
    if (s.length > 0) {
      // tslint:disable-next-line:max-line-length
      const th = this.threads.filter(e => ('' + e.matched + '/' + e.total).toLowerCase().includes(s.toLowerCase()) ||
        e.tags.find(tag => tag.toLowerCase().includes(s.toLowerCase())) != null ||
        e.date_relative.toLowerCase().includes(s.toLowerCase()) || e.authors.toLowerCase().includes(s.toLowerCase()) ||
        e.subject.toLowerCase().includes(s.toLowerCase()));
      this.selectedThreads = th.map(e => 'thread:' + e.thread);
      th.forEach(e => { e.selected = true; });
    }
  }



  selectNone() {
    this.selectedThreads = [];
    this.threads.forEach(e => { e.selected = false; });
  }
  markAsRead() {
    if (this.selectedThreads.length > 0) {
      this.notmuchService.removeTag(this.selectedThreads, 'unread');
      this.threads.forEach(t => {
        if (this.selectedThreads.includes('thread:' + t.thread)) {
          const index = t.tags.indexOf('unread');
          if (index > -1) {
            t.tags.splice(index, 1);
          }
        }
      });
    }
  }

  markthreadAsRead(t: Thread) {

    this.notmuchService.removeTag(['thread:' + t.thread], 'unread');
    const index = t.tags.indexOf('unread');
    if (index > -1) {
      t.tags.splice(index, 1);
    }

    this.messages.forEach(m => {
      const index1 = m.tags.indexOf('unread');
      if (index1 > -1) {
        m.tags.splice(index1, 1);
      }
    });
  }

  markAsUnread() {
    if (this.selectedThreads.length > 0) {
      this.notmuchService.addTag(this.selectedThreads, 'unread');
      this.threads.forEach(t => {
        if (this.selectedThreads.includes('thread:' + t.thread)) {
          t.tags.push('unread');
        }
      });
    }
  }
  markAsStarWithId(t: Thread) {
    this.notmuchService.addTag(['thread:' + t.thread], 'flagged');
    t.tags.push('flagged');
  }
  markAsUnstarredWithId(t: Thread) {
    this.notmuchService.removeTag(['thread:' + t.thread], 'flagged');
    const index = t.tags.indexOf('flagged');
    if (index > -1) {
      t.tags.splice(index, 1);
    }

  }

  markAsTodoWithId(t: Thread) {
    this.notmuchService.addTag(['thread:' + t.thread], 'todo');
    t.tags.push('todo');
  }

  deleteWithId(t: Thread) {
    this.notmuchService.delete(['thread:' + t.thread]);
    this.update();
  }


  markAsUntodoWithId(t: Thread) {
    this.notmuchService.removeTag(['thread:' + t.thread], 'todo');
    const index = t.tags.indexOf('todo');
    if (index > -1) {
      t.tags.splice(index, 1);
    }

  }

  markAsStar() {
    if (this.selectedThreads.length > 0) {
      this.notmuchService.addTag(this.selectedThreads, 'flagged');
      this.threads.forEach(t => {
        if (this.selectedThreads.includes('thread:' + t.thread)) {
          t.tags.push('flagged');
        }
      });
    }
  }

  markAsUnstarred() {
    if (this.selectedThreads.length > 0) {
      this.notmuchService.removeTag(this.selectedThreads, 'flagged');
      this.threads.forEach(t => {
        if (this.selectedThreads.includes('thread:' + t.thread)) {
          const index = t.tags.indexOf('flagged');
          if (index > -1) {
            t.tags.splice(index, 1);
          }
        }
      });
    }
  }



  loadThread(event) {
    // event.first = First row offset
    // event.rows = Number of rows per page
    this.fromMessage = event.first + 1;
    this.toMessage = event.rows;

    this.update();

  }
  toggleSelection(value: boolean, thread: Thread) {
    if (value) {
      this.selectedThreads.push('thread:' + thread.thread);
    } else {
      const index = this.selectedThreads.indexOf('thread:' + thread.thread);
      if (index > -1) {
        this.selectedThreads.splice(index, 1);
      }

    }

  }

  getParent(node): string {
    if (node.parent != null) {
      return this.getParent(node.parent) + '.' + node.label;
    } else {
      return node.label;
    }
  }

  nodeSelect(event) {
    if (this.notmuchService.localmailfoldermultiaccounts) {
      this.query = 'path:' + this.getParent(event.node).replace('.', '/') + '/**';
    } else {
      this.query = 'path:' + this.getParent(event.node) + '/**';
    }
    this.display = false;
    this.fromMessage = 1;
    this.toMessage = 50;
    this.update();
  }

  onSortChange(event) {

  }

  onDialogHide() {
    if (this.selectedThread != null &&
      this.messages != null && this.messages.filter(e => e.tags != null && e.tags.includes('unread')).length === 0) {
      //      this.selectThread.
      this.selectedThread.tags = this.selectedThread.tags.filter(tag => tag !== 'unread');
    }
    this.selectedThread = null;
  }

  onMailHide() {
    //  this.writeemail = false;
    this.cancelMail();
  }

  selectThread(event: Event, thread: Thread) {
    this.notmuchService.getMails(thread.query[0]).then((messages) => {
      if (!this.chronological) {
        this.messages = messages.reverse();
      } else {
        this.messages = messages;
      }
      if (this.messages.length > 0) {
        this.messages[0].tags = this.messages[0].tags.filter(tag => tag !== 'unread');
        this.notmuchService.removeTag(['id:' + this.messages[0].id], 'unread');
      }
      // this.messages.forEach(m => console.log(m.attachments));
    });

    this.selectedThread = thread;
    this.viewmaildetail = true;
    event.preventDefault();
  }

  doQuery() {
    this.display = false;
    this.fromMessage = 1;
    this.toMessage = 50;
    this.update();
  }

  update() {
    this.notmuchService.countAllThread(this.query).subscribe(v => { this.nbThreads = v; });
    this.notmuchService.getThread(this.query, this.fromMessage - 1, this.toMessage, (th) => {
      this.threads = [];
      this.threads = [...th];
      if (this.selectedThreads.length > 0) {
        this.threads.forEach(e => {
          if (this.selectedThreads.includes('thread:' + e.thread)) {
            e.selected = true;
          }
        });
        this.selectedThreads = [];
        this.threads.forEach(e => {
          if (e.selected) {
            this.selectedThreads.push('thread:' + e.thread);
          }
        });
      }
    });
  }
  delete() {
    this.notmuchService.delete(this.selectedThreads);
    this.update();
  }
  archive() {
    this.notmuchService.archive(this.selectedThreads);
    this.update();
  }
  spam() {
    this.notmuchService.spam(this.selectedThreads);
    this.update();

  }
  copyIds() {
    this.copyMessage(this.selectedThreads.join(' '));
  }

  copyMessage(val) {
    const selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = val;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);
  }

  isRead(t: Thread): string {
    if (t.tags.includes('unread')) {
      return 'bold';
    } else {
      return '';

    }
  }

  addTag() {
    if (this.selectedThreads.length > 0 && this.tag.length > 0) {
      this.tag.split(' ').forEach(s => {
        this.notmuchService.addTag(this.selectedThreads, s);
        this.threads.forEach(t => {
          if (this.selectedThreads.includes('thread:' + t.thread)) {
            t.tags.push(s);
          }
        });
      });
    }
    this.tag = '';
    this.addtagvalue = false;
  }

  getColor(): string {
    return 'black';

  }

  checkEnter(event) {
    if (event.keyCode === 13) {
      this.update();
    }
  }

  cancelMail() {
    this.tos = [];
    this.ccs = [];
    this.bccs = [];
    this.mailbody = '';
    this.subject = '';
    this.mailreference = '';
    this.mailinReplyTo = '';

    this.autoCompleteTo.nativeElement.children[0].
      children[0].children[this.autoCompleteTo.nativeElement.children[0].
        children[0].children.length - 1].children[0].value = '';
    this.autoCompleteCc.nativeElement.children[0].
      children[0].children[this.autoCompleteCc.nativeElement.children[0].
        children[0].children.length - 1].children[0].value = '';
    this.autoCompleteBcc.nativeElement.children[0].
      children[0].children[this.autoCompleteBcc.nativeElement.children[0].
        children[0].children.length - 1].children[0].value = '';


    this.resultsto = [];
    this.resultscc = [];
    this.resultsbcc = [];
    this.uploadedFiles = [];
    this.uploadFilesMap = new Map();
    this.writeemail = false;
    this.onDialogHide();
    this.viewmaildetail = false;


  }
  saveAsDraft() {
    this.notmuchService.sendMail(this.from,
      this.tos.join(', '), this.ccs.join(', '), this.bccs.join(', '), this.subject,
      this.mailbody, this.uploadFilesMap, true,
      this.mailreference, this.mailinReplyTo, (res => {
        if (res) {
          this.messageService.add({ severity: 'info', summary: 'Draft saved in Drafts folder', detail: '' });
        } else {
          this.messageService.add({ severity: 'error', summary: 'Cannot saved Draft in Drafts folder', detail: '' });
        }
      }));
    this.cancelMail();
  }
  sendMail() {
    // tslint:disable-next-line:max-line-length
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    let validadress = true;
    if (this.tos.length > 0) {
      this.tos.forEach(email => {
        let emailcheck = email.trim();
        if (email.includes('<')) {
          emailcheck = email.slice(email.indexOf('<') + 1, email.indexOf('>')).trim();
        }
        console.log(emailcheck);
        validadress = validadress && re.test(emailcheck);
        console.log(validadress);
      });
    }
    if (this.ccs.length > 0) {

      this.ccs.forEach(email => {
        let emailcheck = email.trim();
        if (email.includes('<')) {
          emailcheck = email.slice(email.indexOf('<') + 1, email.indexOf('>')).trim();
        }
        console.log(emailcheck);
        validadress = validadress && re.test(emailcheck);
        console.log(validadress);
      });
    }
    if (this.bccs.length > 0) {

      this.bccs.forEach(email => {
        let emailcheck = email.trim();
        if (email.includes('<')) {
          emailcheck = email.slice(email.indexOf('<') + 1, email.indexOf('>')).trim();
        }
        console.log(emailcheck);
        validadress = validadress && re.test(emailcheck);
        console.log(validadress);
      });
    }
    if (validadress) {

      this.notmuchService.sendMail(this.from,
        this.tos.join(', '), this.ccs.join(', '), this.bccs.join(', '), this.subject,
        this.mailbody, this.uploadFilesMap, false, this.mailreference, this.mailinReplyTo,
        (res => {
          if (res) {
            this.messageService.add({ severity: 'info', summary: 'Email sent', detail: '' });
          } else {
            this.messageService.add({
              severity: 'warning',
              summary: 'Cannot send message (no connection), message will be sent later (placed in Outbox folder)', detail: ''
            });
          }
        }));
      this.cancelMail();
    } else {
      this.messageService.add({ severity: 'error', summary: 'cannot sent email please check email address', detail: '' });
    }

  }
  isHtml(message: Mail): boolean {
    const dom = jsel(message);
    return dom.selectAll('//@content-type').includes('text/html');
  }
  getHtml(message: Mail) {
    /*    const dom = jsel(message);
        let html = this.sanitizer.bypassSecurityTrustHtml(dom.select('//*[@content-type="text/html"]/@content'));



        if (this.mailContent != null) {
          const imgTags = this.mailContent.nativeElement.getElementsByTagName('img');
          for (let i = 0; i < imgTags.length; i++) {
            if (imgTags[i].src.startsWith('unsafe:cid:')) {
              const cid = imgTags[i].src.substring(11, imgTags[i].src.length);
              const inline = message.inlines.find(e => {
                return e['content-id'] === cid;
              });
             if (inline !== null) {
            //   console.log('data:' + inline['content-type'] + ';base64,' + inline);
               imgTags[i].src = 'data:' + inline['content-type'] + ';base64,' + inline.content;
              }
            }
          }
        }
        // const html: SafeHtml = this.sanitizer.bypassSecurityTrustHtml('test');
        // const html = this.sanitizer.sanitize(SecurityContext.HTML, 'test');
        // console.log(html);*/
    //    const html = this.sanitizer.sanitize(SecurityContext.HTML, message.content );

    return message.content;
  }


  getTextPlain(message: Mail): string {
    const dom = jsel(message);
    return dom.select('//*[@content-type="text/plain"]/@content');

  }

  showSaveDialog(event, name, messageid, partid) {
    event.stopPropagation();
    event.preventDefault();
    this.notmuchService.showSaveAsDialog(name, messageid, partid);
  }



  onTabOpen(e) {
    const index = e.index;
    if ((this.messages[index].tags != null) && (this.messages[index].tags.includes('unread'))) {
      this.notmuchService.removeTag(['id:' + this.messages[index].id], 'unread');
      this.messages[index].tags = this.messages[index].tags.filter(tag => tag !== 'unread');

    }
  }

  handleChangeAllThread($event) {
    this.notmuchService.setAllthread(this.allThread);
  }


  handleChangeChronological($event) {
    this.messages = this.messages.reverse();
    if (this.messages.length > 0) {
      this.messages[0].tags = this.messages[0].tags.filter(tag => tag !== 'unread');
      this.notmuchService.removeTag(['id:' + this.messages[0].id], 'unread');
    }

  }

  handleChangeSpamAndTrash($event) {
    this.notmuchService.setIncludeSpamAndTrash(this.allThread);
  }

  createTask() {
    this.task = false;

    this.rtmservice.addTask(this.tasktitre, this.taskdate, 'id:' + this.taskmessage.id).then(e => {
      this.messageService.add({ severity: 'info', summary: 'task added', detail: '' });
      this.taskdate = null;
      this.taskmessage = null;
      this.tasktitre = null;
    }).catch(e => {
      this.messageService.add({ severity: 'warning', summary: 'cannot add task', detail: '' });
      this.taskdate = null;
      this.taskmessage = null;
      this.tasktitre = null;
    });

  }

  getColorThread(t: Thread): string {
    let color = 'black';
    this.notmuchService.colortags.forEach(colort => {
      if (colort.tags.split(' ').every(tag => t.tags.includes(tag))) {
        color = colort.color;
      }
    });
    return color;

  }
  onIcsHide() {
    console.log(this.icsallday);
    this.ics = false;
    this.icsallday = false;

  }

  onIcsShow() {

  }

  onTaskHide() {
    this.task = false;
  }

  onTaskShow() {

  }
  isElectron = () => {
    return window && window.process && window.process.type;
  }

}
