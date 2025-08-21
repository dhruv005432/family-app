import { Injectable, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class SpeechService {
  private recognition: any | null = null;
  private _isListening = false;
  private isBrowser = false;

  interimText$ = new BehaviorSubject<string>('');
  finalText$ = new Subject<string>();
  error$ = new Subject<string>();

  constructor(private zone: NgZone, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (!this.isBrowser) {
      console.log('SpeechService: not running in browser (no window).');
      this.error$.next('No browser environment for SpeechRecognition.');
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.log('SpeechService: SpeechRecognition not supported.');
      this.error$.next('SpeechRecognition not supported in this browser.');
      return;
    }

    try {
      this.recognition = new SR();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            // send each final chunk
            this.zone.run(() => this.finalText$.next(transcript));
          } else {
            interim += transcript;
          }
        }
        this.zone.run(() => this.interimText$.next(interim));
        console.log('SpeechService.onresult', JSON.stringify({ interim }));
      };

      this.recognition.onerror = (e: any) => {
        console.error('SpeechService.onerror', e);
        this.zone.run(() => this.error$.next(e?.error || 'recognition error'));
      };

      this.recognition.onend = () => {
        console.log('SpeechService: recognition ended');
        this.zone.run(() => this._isListening = false);
      };
    } catch (err) {
      console.error('SpeechService init error', err);
      this.error$.next('Speech init failed');
    }
  }

  get isListening(): boolean { return this._isListening; }

  start() {
    if (!this.isBrowser || !this.recognition) {
      this.error$.next('Speech not available');
      console.log('SpeechService.start prevented: not available');
      return;
    }
    if (this._isListening) {
      this.error$.next('Already listening');
      console.log('SpeechService.start prevented: already listening');
      return;
    }
    try {
      this.recognition.start();
      this._isListening = true;
      console.log('SpeechService: started');
    } catch (err) {
      console.error('SpeechService.start error', err);
      this.error$.next('Start failed');
    }
  }

  stop() {
    if (!this.isBrowser || !this.recognition) {
      this.error$.next('Speech not available');
      return;
    }
    if (!this._isListening) {
      this.error$.next('Not listening');
      console.log('SpeechService.stop prevented: not listening');
      return;
    }
    try {
      this.recognition.stop();
      this._isListening = false;
      console.log('SpeechService: stopped');
    } catch (err) {
      console.error('SpeechService.stop error', err);
      this.error$.next('Stop failed');
    }
  }
}
