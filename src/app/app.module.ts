import 'reflect-metadata';
import '../polyfills';
import { BrowserModule } from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { HttpClientModule, HttpClient } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';

// NG Translate
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import {MenubarModule} from 'primeng/menubar';

import { ElectronService } from './providers/electron.service';

import { WebviewDirective } from './directives/webview.directive';
import {DialogModule} from 'primeng/dialog';

import {AccordionModule} from 'primeng/accordion';     // accordion and accordion tab
import {TreeModule} from 'primeng/tree';
import {ButtonModule} from 'primeng/button';
import {PanelModule} from 'primeng/panel';
import {TabViewModule} from 'primeng/tabview';
import {SplitButtonModule} from 'primeng/splitbutton';

import { AppComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';
import {SidebarModule} from 'primeng/sidebar';
import {ToastModule} from 'primeng/toast';
import {MessageService} from 'primeng/api';
import {DataViewModule} from 'primeng/dataview';
import {DropdownModule} from 'primeng/dropdown';
import {CheckboxModule} from 'primeng/checkbox';
import {RatingModule} from 'primeng/rating';
import {AutoCompleteModule} from 'primeng/autocomplete';

import { ClipboardModule } from 'ngx-clipboard';
import {EditorModule} from 'primeng/editor';
import {InputTextModule} from 'primeng/inputtext';
import {FileUploadModule} from 'primeng/fileupload';
import {InputSwitchModule} from 'primeng/inputswitch';

import { TagfilterPipe } from './tagfilter.pipe';
import {HotkeyModule} from 'angular2-hotkeys';
import {TooltipModule} from 'primeng/tooltip';
import {CalendarModule} from 'primeng/calendar';
import {SliderModule} from 'primeng/slider';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {ConfirmationService} from 'primeng/api';



// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    WebviewDirective,
    TagfilterPipe
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    ButtonModule,
    PanelModule,
    TabViewModule,
    MenubarModule,
    SidebarModule,
    TreeModule,
    DropdownModule,
    ToastModule,
    DataViewModule,
    RatingModule,
    CheckboxModule,
    AccordionModule,
    ClipboardModule,
    DialogModule,
    SplitButtonModule,
    AutoCompleteModule,
    EditorModule,
    InputTextModule,
    FileUploadModule,
    InputSwitchModule,
    TooltipModule,
    CalendarModule,
    SliderModule,
    ConfirmDialogModule,
    HotkeyModule.forRoot(),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (HttpLoaderFactory),
        deps: [HttpClient]
      }
    })
  ],
  providers: [ElectronService, MessageService, ConfirmationService],
  bootstrap: [AppComponent]
})
export class AppModule { }
