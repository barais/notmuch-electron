export interface Header {
  Subject: string;
  From: string;
  To: string;
  Cc: string;
  Bcc: string;
  ReplyTo: string;
  InReplyTo: string;
  References: string;
  Date: string;
}

export default Header;
