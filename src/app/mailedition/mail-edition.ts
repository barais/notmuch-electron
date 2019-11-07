export class MailEdition {
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



}
