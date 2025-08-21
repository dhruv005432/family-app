import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { SpeechComponent } from './speech/speech.component';
import { AboutComponent } from './about/about.component';
import { ContactComponent } from './contact/contact.component';


const routes: Routes = [
  // Default path redirect to Home
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // Route to HomeComponent
  { path: 'home', component: HomeComponent },

  // Route to SpeechComponent (speech-to-text)
  { path: 'speech',component:SpeechComponent},
  
  // Route to AboutComponent 
  {path: 'about',component: AboutComponent},

  // Route to ContactComponent
  {path:'contact',component:ContactComponent},


  // Wildcard route (optional)
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
