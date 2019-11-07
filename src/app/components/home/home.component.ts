import { Component, OnInit, Inject, ViewChild, ElementRef, AfterViewInit, Renderer2, SecurityContext } from '@angular/core';
import { MenuItem, ConfirmationService, TabView } from 'primeng/primeng';
import { SelectItem } from 'primeng/primeng';
import { TreeNode } from 'primeng/api';
import { MessageService } from 'primeng/api';
import Thread from '../../thread';
import { Mail } from '../../mail';


import { DOCUMENT, DomSanitizer } from '@angular/platform-browser';
import { HotkeysService, Hotkey } from 'angular2-hotkeys';
import { NotMuchService } from '../../not-much.service';
import { RtmService } from '../../rtm.service';
import { ElectronService } from '../../providers/electron.service';
import { SpellCheckHandler, ContextMenuListener, ContextMenuBuilder } from 'electron-spellchecker';
import 'rxjs/add/observable/merge';
import { MailEdition } from 'src/app/mailedition/mail-edition';


// import { NotMuchServiceMock } from '../../not-much.service.mock';



@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit {


  @ViewChild(TabView) tabView: TabView;

//  froms: SelectItem[];
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

 // selectedThread: Thread;

  // viewmaildetail: boolean;
  selectmatch = '';
  tag = '';
  addtagvalue: boolean;

 // tabindex = 0;
/*  from = '';
  tos = [];
  ccs = [];
  bccs = [];
  subject = '';
  mailbody = '';
  uploadedFiles: any[] = [];
  uploadFilesMap: Map<any, any> = new Map();
  mailreference: string;
  mailinReplyTo: string;*/


  // Code completion
//  resultsto: string[];
//  resultscc: string[];
//  resultsbcc: string[];


  // Code completion
  resultresearch: any[] = [];


  selectedThreads: string[] = [];
  selectedThreadsView: Thread[] = [];
  mailEditionViews: MailEdition[] = [];

  allThread = false;
  showSpamTrash = false;
  // FullScreen
  elem;

  interval;



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
    this.query = this.notmuchService.defaultquery;


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
    // TODO only if main tab is opened
//    if (!this.writeemail && !this.viewmaildetail && this.selectedThread == null) {
      this.update();
//    }

  }

  ngAfterViewInit() {
    console.log('toto');
    //    this.editorel.el.nativeElement.focus();
  }

  /*
  onEditorInit(event: any) {
    event.editor.root.focus();
  }
*/

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


  newMail() {
    for (const t of this.tabView.tabs) {
      if (t.selected) {
           t.selected = false;
      }
    }
    this.mailEditionViews.push(new MailEdition());
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

  // TODO update thread tag when close
  /*onDialogHide() {
    if (this.selectedThread != null &&
      this.messages != null && this.messages.filter(e => e.tags != null && e.tags.includes('unread')).length === 0) {
      //      this.selectThread.
      this.selectedThread.tags = this.selectedThread.tags.filter(tag => tag !== 'unread');
    }
    this.selectedThread = null;
  }*/



  selectThread(event: Event, thread: Thread) {
    for (const t of this.tabView.tabs) {
      if (t.selected) {
           t.selected = false;
      }
      if (t.header === thread.subject) {
        t.selected = true;
      }

    }
    if (! this.selectedThreadsView.some(t => t === thread)) {
      this.selectedThreadsView.push(thread);
    }

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

  handleChangeAllThread($event) {
    this.notmuchService.setAllthread(this.allThread);
  }


  handleChangeSpamAndTrash($event) {
    this.notmuchService.setIncludeSpamAndTrash(this.allThread);
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
  isElectron = () => {
    return window && window.process && window.process.type;
  }


handleTabChange(e) {
  const index = e.index;
  console.log(e);
}

handleTabExit(e) {
  const index = e.index;
  const lengththreads = this.selectedThreadsView.length;
  if (index <= lengththreads) {
    const selectedThread = this.selectedThreadsView.splice(index - 1 , 1)[0];
    if (selectedThread != null ) {
      selectedThread.tags = selectedThread.tags.filter(tag => tag !== 'unread');
    }

  } else if (index <= lengththreads + this.mailEditionViews.length) {
    this.mailEditionViews.splice(index - this.selectedThreadsView.length - 1 , 1);
  }
  for (const t of this.tabView.tabs) {
    if (t.selected) {
         t.selected = false;
    }
  }
}

getSelected(item) {
  if (this.selectedThreadsView[this.selectedThreadsView.length - 1] ===  item) {
    return true;
  }
  return false;
}

getSelectedMail(mail) {
  if (this.mailEditionViews[this.mailEditionViews.length - 1] ===  mail) {
    return true;
  }
  return false;
}


    cancelMail(mail: MailEdition) {
      this.mailEditionViews.splice(this.mailEditionViews.indexOf(mail) , 1);
    }

    editMail(mail: MailEdition) {
      console.log('edit mail');
      for (const t of this.tabView.tabs) {
        if (t.selected) {
             t.selected = false;
        }
      }
      this.mailEditionViews.push(mail);

    }

}
