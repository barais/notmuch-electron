import Header from './header';

export interface ShowResult {
  listmails: Array<Array<Mail>>;

}


export interface Mail {
  id: string;
  match: boolean; // : true,
  excluded: boolean; // ": false,
  filename: string[]; // ": ["/home/barais/mail/INBOX/cur/1551726142_3.12560.kevtop2,U=4156215,FMD5=7e33429f656f1e6e9d79b29c3f82c57e:2,S"],
  timestamp; // ": 1541772202,
  date_relative: string; // ": "November 09",
  tags: string[];  // ": ["inbox"],
  headers: Header;
  body: Body[];
  attachments: any[];
  inlines: any[];
  content: string;

}
