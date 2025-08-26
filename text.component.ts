import { Component, Inject, OnInit, PLATFORM_ID, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.css']
})
export class TextComponent implements OnInit, OnDestroy {
  /** Single variable to store all data */
  textStore: string = '';
  searchQuery: string = '';

  /** Speech recognition */
  private recognition: any;
  listening: boolean = false;
  private lastHeard: string = '';
  private lastAt: number = 0;

  private STORAGE_KEY = 'voiceToTextStore';

  constructor(
    private snack: MatSnackBar,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.loadFromStorage();

    console.log('Component Init:', JSON.stringify({ textStore: this.textStore }));
    debugger;

    if (!this.speechSupported) {
      this.snack.open('❌ Voice recognition not supported in this browser.', 'Close', {
        duration: 2500, horizontalPosition: 'left', verticalPosition: 'top'
      });
      return;
    }

    this.initSpeech();
    this.startVoice(); // compulsory start
  }

  ngOnDestroy(): void {
    if (this.recognition && this.listening) {
      this.recognition.stop();
    }
  }

  // ---------- Speech Recognition ----------
  get speechSupported(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    const w = window as any;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  private initSpeech(): void {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    this.recognition = new SR();

    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (!res.isFinal) continue;

        let transcript = res[0].transcript.trim();
        transcript = transcript.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim(); // remove symbols

        if (!transcript) continue;

        // Duplicate guard (2 sec)
        const now = Date.now();
        if (transcript === this.lastHeard && now - this.lastAt < 2000) {
          this.snack.open('⚠️ Duplicate detected!', 'Close', {
            duration: 1500, horizontalPosition: 'left', verticalPosition: 'top'
          });
          return;
        }
        this.lastHeard = transcript;
        this.lastAt = now;

        this.textStore = this.textStore ? `${this.textStore} ${transcript}` : transcript;
        this.saveToStorage();

        console.log('Recognized:', JSON.stringify(transcript));
        debugger;

        this.snack.open('🎤 Voice captured!', 'Close', {
          duration: 1200, horizontalPosition: 'right', verticalPosition: 'top'
        });
      }
    };

    this.recognition.onerror = (err: any) => {
      console.error('Speech error:', err);
      this.snack.open('⚠️ Voice recognition error', 'Close', {
        duration: 1500, horizontalPosition: 'left', verticalPosition: 'top'
      });
    };
  }

  startVoice(): void {
    if (!this.recognition || this.listening) return;
    this.recognition.start();
    this.listening = true;
    this.snack.open('▶️ Listening started…', 'Close', {
      duration: 1200, horizontalPosition: 'right', verticalPosition: 'top'
    });
  }

  stopVoice(): void {
    if (!this.recognition || !this.listening) return;
    this.recognition.stop();
    this.listening = false;
    this.snack.open('⏹ Listening stopped', 'Close', {
      duration: 1200, horizontalPosition: 'right', verticalPosition: 'top'
    });
  }

  // ---------- Actions ----------
  clearAll(): void {
    this.textStore = '';
    this.searchQuery = '';
    this.lastHeard = '';
    this.lastAt = 0;
    this.clearStorage();

    console.log('Cleared all');
    debugger;

    this.snack.open('🗑 Cleared!', 'Close', {
      duration: 1200, horizontalPosition: 'right', verticalPosition: 'top'
    });
  }

  copyText(): void {
    if (!this.textStore.trim()) {
      this.snack.open('⚠️ Nothing to copy', 'Close', { duration: 1200 });
      return;
    }
    navigator.clipboard.writeText(this.textStore).then(() => {
      console.log('Copied:', JSON.stringify(this.textStore));
      debugger;
      this.snack.open('✅ Copied to clipboard', 'Close', { duration: 1200 });
    });
  }

  onSearch(): void {
    console.log('Search:', JSON.stringify(this.searchQuery));
    debugger;
    if (!this.searchQuery.trim()) {
      this.snack.open('⚠️ Enter search text', 'Close', { duration: 1200 });
      return;
    }
    this.snack.open(`Searching "${this.searchQuery}"…`, 'Close', { duration: 1500 });
  }

  // ---------- Storage ----------
  private saveToStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.textStore || ''));
    }
  }

  private loadFromStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this.textStore = raw ? JSON.parse(raw) : '';
    }
  }

  private clearStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }
}
