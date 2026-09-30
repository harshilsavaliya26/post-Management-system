import { Component } from '@angular/core';
import { Posts } from './posts/posts';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Posts],
  template: '<app-posts></app-posts>'
})
export class App {}