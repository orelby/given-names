import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Header } from "./layout/header";
import { Footer } from "./layout/footer";


@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet, CommonModule,
    Header, Footer,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
}
