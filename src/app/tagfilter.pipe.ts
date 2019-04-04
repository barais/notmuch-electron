import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'tagfilter',
  pure: false
})
export class TagfilterPipe implements PipeTransform {

  transform(items: string[]): any {
    return items.filter(item => !['unread', 'inbox', 'flagged'].includes(item));
}
}
