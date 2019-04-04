import { Component, OnInit, Inject, ViewChild, ElementRef, AfterViewInit, Renderer2 } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { environment } from '../environments/environment';


// import { ElectronService } from './providers/electron.service';



/**
 * Enables spell-checking and the right-click context menu in text editors.
 * Electron (`webFrame.setSpellCheckProvider`) only underlines misspelled words;
 * we must manage the menu ourselves.
 *
 * Run this in the renderer process.
 */
// const remote = require('electron').remote;
// const webFrame = require('electron').webFrame;
// `remote.require` since `Menu` is a main-process module.

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent  implements OnInit, AfterViewInit {
/*  electronSpellchecker;
  SpellCheckHandler;
  ContextMenuListener;
  ContextMenuBuilder;*/
  constructor() {

/*    if (this.isElectron()) {
      this.electronSpellchecker = window.require('electron-spellchecker');
      this.SpellCheckHandler = this.electronSpellchecker.SpellCheckHandler;
      this.ContextMenuListener = this.electronSpellchecker.ContextMenuListener;
      this.ContextMenuBuilder = this.electronSpellchecker.ContextMenuBuilder;
      }*/


  }
  ngAfterViewInit(): void {


  }
  ngOnInit(): void {
   /* window.spellCheckHandler = new this.SpellCheckHandler();
    setTimeout(() => window.spellCheckHandler.attachToInput(), 1000);

    window.spellCheckHandler.provideHintText('This is probably the language that you want to check in');
    window.spellCheckHandler.autoUnloadDictionariesOnBlur();

     window.contextMenuBuilder = new this.ContextMenuBuilder(window.spellCheckHandler, null, true);
     window.contextMenuListener = new this.ContextMenuListener((info) => {
      if (info.isEditable) {
        window.contextMenuBuilder.showPopupMenu(info);
      }
     });*/

/*   const buildEditorContextMenu = this._electronService.remote.require('electron-editor-context-menu');

   window.addEventListener('contextmenu', (e) => {
     // Only show the context menu in text editors.
     console.log(e);
     console.log(e.target);

     const targ = e.target as any;
     if (!targ.closest('textarea, input, [contenteditable="true"]')) { return; }


     // Ensure that we have valid corrections for that word
     // let corrections = window.spellCheckHandler.getCorrectionsForMisspelling(menuInfo.misspelledWord);

     const selection = {
      isMisspelled: true,
      spellingSuggestions: [
        'men',
        'mean',
        'menu'
      ]
    };

    const menu = buildEditorContextMenu(selection);


     // The 'contextmenu' event is emitted after 'selectionchange' has fired but possibly before the
     // visible selection has changed. Try to wait to show the menu until after that, otherwise the
     // visible selection will update after the menu dismisses and look weird.
     setTimeout(() => {
       menu.popup( this._electronService.remote.getCurrentWindow());
     }, 30);
   });*/

  }

 /* isElectron = () => {
    return window && window.process && window.process.type;
  }*/

}
