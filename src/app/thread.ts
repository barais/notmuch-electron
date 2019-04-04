export interface Thread {

  thread: string;
  timestamp: number;
  date_relative: string;
  matched: number;
  total: number;
  authors: string;
  subject: string;
  query: string[];
  tags: string[];
  selected: boolean;
}
export default Thread;
