import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {

  // Speech-to-text info (mock data)
  speechInfo = "This app supports real-time speech to text conversion. Start speaking and see your words appear instantly!";

  // Welcome message + slogan
  welcomeMessage = "Welcome to Our Speech-to-Text App!";
  slogan = "Speak Freely, Type Instantly.";

}
