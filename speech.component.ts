import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { isPlatformBrowser } from '@angular/common';
import { SpeechService } from '../speech.service';
import { StorageService } from '../storage.service';


@Component({
  selector: 'app-speech',
  templateUrl: './speech.component.html',
  styleUrls: ['./speech.component.scss']
})
export class SpeechComponent implements OnInit, OnDestroy {
  // UI-bound text
  interimText = '';
  finalText = '';

  // Debug variables required
  speechText = '';    // full text state (same as finalText)
  speechNumber = '';  // last number spoken

  // control
  isListening = false;
  private subs: Subscription[] = [];
  private canUseStorage = false;
  private isBrowser = false;

  constructor(
    private speech: SpeechService,
    private snackBar: MatSnackBar,
    private store: StorageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.canUseStorage = this.isBrowser; // StorageService already checks but double-check
  }

  ngOnInit(): void {
    console.log('SpeechComponent.ngOnInit');
    debugger;

    // Restore persisted final text (safe)
    if (this.canUseStorage) {
      const saved = this.store.getItem('finalText');
      if (saved) {
        this.finalText = saved;
        this.speechText = saved;
        console.log('Restored finalText:', JSON.stringify(saved));
      }
    }

    // Subscribe to interim & final from service
    this.subs.push(
      this.speech.interimText$.subscribe(t => {
        this.interimText = t;
        console.log('Interim update:', JSON.stringify(t));
      }),
      this.speech.finalText$.subscribe(t => {
        const trimmed = (t || '').trim();
        if (!trimmed) return;

        console.log('Final chunk received:', JSON.stringify(trimmed));
        // If command words present, process them (delete/email)
        if (this.processCommand(trimmed)) {
          // command processed — skip appending that chunk
          return;
        }

        // Append to final text
        this.finalText += (this.finalText ? ' ' : '') + trimmed;
        this.speechText = this.finalText;

        // detect number
        if (!isNaN(Number(trimmed))) {
          this.speechNumber = trimmed;
          console.log('Number detected:', this.speechNumber);
          // persist number optionally
          if (this.canUseStorage) this.store.setItem('speechNumber', this.speechNumber);
        }

        // persist finalText
        if (this.canUseStorage) this.store.setItem('finalText', this.finalText);

        // clear interim (final chunk consumed)
        this.interimText = '';

        this.snack('Speech recognized', 'success');
        console.log('FinalText updated:', JSON.stringify(this.finalText));
        debugger;
      }),
      this.speech.error$.subscribe(err => {
        if (!err) return;
        console.error('SpeechService error:', err);
        this.snack(`Error: ${err}`, 'error');
        this.isListening = false;
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // Start/Stop with duplicate prevention
  start(): void {
    if (this.speech.isListening) {
      this.snack('Already listening', 'error');
      console.log('start() prevented: already listening');
      return;
    }
    this.speech.start();
    this.isListening = true;
    this.snack('Started listening', 'success');
    console.log('start() executed');
  }

  stop(): void {
    if (!this.speech.isListening) {
      this.snack('Not listening', 'error');
      console.log('stop() prevented: not listening');
      return;
    }
    this.speech.stop();
    this.isListening = false;
    this.snack('Stopped listening', 'success');
    console.log('stop() executed');
  }

  // clear final & interim
  clearText(): void {
    this.finalText = '';
    this.interimText = '';
    this.speechText = '';
    if (this.canUseStorage) this.store.removeItem('finalText');
    this.snack('Text cleared', 'success');
    console.log('clearText executed');
  }

  // copy interim or final
  copy(type: 'interim' | 'final'): void {
    const val = type === 'final' ? this.finalText.trim() : this.interimText.trim();
    if (!val) {
      this.snack('Nothing to copy', 'error');
      console.log('copy skipped: empty');
      return;
    }
    navigator.clipboard.writeText(val).then(() => {
      this.snack(`${type} copied`, 'success');
      console.log('copy success', JSON.stringify({ type, value: val }));
    });
  }

  // commit interim -> final (manual)
  commitInterimToFinal(): void {
    const chunk = this.interimText.trim();
    if (!chunk) {
      this.snack('Nothing in interim to add', 'error');
      console.log('commitInterimToFinal skipped');
      return;
    }
    // check commands first
    if (this.processCommand(chunk)) return;

    this.finalText += (this.finalText ? ' ' : '') + chunk;
    this.speechText = this.finalText;

    if (!isNaN(Number(chunk))) {
      this.speechNumber = chunk;
      if (this.canUseStorage) this.store.setItem('speechNumber', this.speechNumber);
    }

    if (this.canUseStorage) this.store.setItem('finalText', this.finalText);

    this.interimText = '';
    this.snack('Interim added to final', 'success');
    console.log('commitInterimToFinal executed:', JSON.stringify(this.finalText));
    debugger;
  }

  // process commands from recognized text; returns true if handled (so caller won't append)
  private processCommand(text: string): boolean {
    const lower = (text || '').toLowerCase();

    if (lower.includes('delete')) {
      this.clearText();
      console.log('Voice command: delete');
      return true;
    }

    if (lower.includes('email')) {
      // open default email client via mailto (subject+body)
      const subject = encodeURIComponent('Speech to Text');
      const body = encodeURIComponent(this.finalText || '');
      if (this.isBrowser) {
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
      }
      this.snack('Opening email app…', 'success');
      console.log('Voice command: email');
      return true;
    }

    return false;
  }

  // small snackbar helper (top-right)
  private snack(message: string, type: 'success' | 'error') {
    this.snackBar.open(message, 'X', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: type === 'success' ? ['snackbar-success'] : ['snackbar-error']
    });
    console.log('snack:', JSON.stringify({ message, type }));
  }
}
