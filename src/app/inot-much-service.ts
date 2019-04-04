import { TreeNode } from 'primeng/api';
import { Thread } from './thread';

export abstract class INotMuchService {

  abstract getMailFolder(): TreeNode[] ;
  abstract getThread(query: string, offset: number, rows: number, ret: (res: Thread[]) => any)  ;
  abstract addTag(threadIds: string[], tag: string);
  abstract removeTag(threadIds: string[], tag: string);

  abstract delete(threadIds: string[]) ;

  abstract spam(threadIds: string[]);

  abstract archive(threadIds: string[]);

}

export default INotMuchService;
