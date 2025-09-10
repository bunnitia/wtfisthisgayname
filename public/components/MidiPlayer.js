/**
 * MIDI Player Component
 * Parses and plays MIDI files using existing sound samples
 */
class MidiPlayer {
    constructor(url, fileInfo) {
        this.url = url;
        this.fileInfo = fileInfo;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTime = 0;
        this.duration = 0;
        this.events = [];
        this.timeouts = [];
        this.startTime = 0;
        this.pauseTime = 0;
        
        // Sound mapping for 88-key piano
        this.soundMapping = this.createSoundMapping();
        
        // Audio context for managing multiple sounds
        this.audioContext = null;
        this.audioBuffers = new Map();
        this.activeNotes = new Map(); // Track sustaining notes
        
        this.element = this.createElement();
        this.initializeAudioContext();
        this.loadMidiFile();
    }
    
    createSoundMapping() {
        // Map MIDI note numbers to sound file names
        // Based on the files in /mppclassic/ folder
        const mapping = {};
        
        // Manual mapping based on the actual files available
        // MIDI note 21 = A0, 22 = A#0, 23 = B0, 24 = C1, etc.
        
        // A0, A#0, B0 (MIDI 21-23) - use the -1 octave files
        mapping[21] = '/mppclassic/a-1.mp3';   // A0
        mapping[22] = '/mppclassic/as-1.mp3';  // A#0
        mapping[23] = '/mppclassic/b-1.mp3';   // B0 - actually doesn't exist, but we'll map it
        
        // Map the available files based on their actual names
        // Octave 0 files
        const octave0Notes = [
            {midi: 24, file: 'c0.mp3'},   // C1 (MIDI 24)
            {midi: 25, file: 'cs0.mp3'},  // C#1
            {midi: 26, file: 'd0.mp3'},   // D1
            {midi: 27, file: 'ds0.mp3'},  // D#1
            {midi: 28, file: 'e0.mp3'},   // E1
            {midi: 29, file: 'f0.mp3'},   // F1
            {midi: 30, file: 'fs0.mp3'},  // F#1
            {midi: 31, file: 'g0.mp3'},   // G1
            {midi: 32, file: 'gs0.mp3'},  // G#1
            {midi: 33, file: 'a0.mp3'},   // A1
            {midi: 34, file: 'as0.mp3'},  // A#1
            {midi: 35, file: 'b0.mp3'}    // B1
        ];
        
        // Continue this pattern for octaves 1-6
        for (let octave = 0; octave <= 6; octave++) {
            const noteNames = ['c', 'cs', 'd', 'ds', 'e', 'f', 'fs', 'g', 'gs', 'a', 'as', 'b'];
            
            for (let noteIndex = 0; noteIndex < 12; noteIndex++) {
                const midiNote = 24 + (octave * 12) + noteIndex; // C1 starts at MIDI 24
                if (midiNote > 108) break; // Don't exceed piano range
                
                const noteName = noteNames[noteIndex];
                const fileName = `${noteName}${octave}.mp3`;
                mapping[midiNote] = `/mppclassic/${fileName}`;
            }
        }
        
        // Add the highest C (C8 = MIDI 108) if C7 exists
        if (mapping[96]) { // C7 exists (MIDI 96)
            mapping[108] = '/mppclassic/c7.mp3'; // Map C8 to C7
        }
        
        return mapping;
    }
    
    async initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
        }
    }
    
    async loadAudioBuffer(url) {
        if (this.audioBuffers.has(url)) {
            return this.audioBuffers.get(url);
        }
        
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioBuffers.set(url, audioBuffer);
            return audioBuffer;
        } catch (error) {
            console.error(`Failed to load audio buffer for ${url}:`, error);
            return null;
        }
    }
    
    async playNote(midiNote, velocity = 1.0, duration = null) {
        if (!this.audioContext || !this.soundMapping[midiNote]) {
            return null;
        }
        
        const soundUrl = this.soundMapping[midiNote];
        const audioBuffer = await this.loadAudioBuffer(soundUrl);
        
        if (!audioBuffer) {
            return null;
        }
        
        // Create audio source
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = audioBuffer;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Set volume based on velocity
        gainNode.gain.value = Math.max(0.1, Math.min(1.0, velocity));
        
        // Start playing
        source.start();
        
        // Store active note for sustain pedal support
        const noteId = `${midiNote}_${Date.now()}`;
        this.activeNotes.set(noteId, { source, gainNode, midiNote });
        
        // Handle note duration or natural decay
        if (duration !== null) {
            setTimeout(() => {
                this.stopNote(noteId);
            }, duration * 1000);
        } else {
            // Natural decay - remove from active notes when ended
            source.onended = () => {
                this.activeNotes.delete(noteId);
            };
        }
        
        return noteId;
    }
    
    stopNote(noteId) {
        const note = this.activeNotes.get(noteId);
        if (note) {
            try {
                note.source.stop();
            } catch (e) {
                // Already stopped
            }
            this.activeNotes.delete(noteId);
        }
    }
    
    stopAllNotes() {
        for (const noteId of this.activeNotes.keys()) {
            this.stopNote(noteId);
        }
    }
    
    async loadMidiFile() {
        try {
            const response = await fetch(this.url);
            const arrayBuffer = await response.arrayBuffer();
            this.events = this.parseMidiFile(arrayBuffer);
            this.duration = this.calculateDuration();
            this.updateDurationDisplay();
        } catch (error) {
            console.error('Failed to load MIDI file:', error);
            this.showError('Failed to load MIDI file');
        }
    }
    
    parseMidiFile(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        let offset = 0;
        const events = [];
        
        // Parse MIDI header
        const headerChunk = this.readString(view, offset, 4);
        if (headerChunk !== 'MThd') {
            throw new Error('Invalid MIDI file: Missing MThd header');
        }
        
        offset += 4;
        const headerLength = view.getUint32(offset);
        offset += 4;
        
        const format = view.getUint16(offset);
        offset += 2;
        const trackCount = view.getUint16(offset);
        offset += 2;
        const division = view.getUint16(offset);
        offset += 2;
        
        // Parse tracks
        for (let i = 0; i < trackCount; i++) {
            const trackEvents = this.parseTrack(view, offset);
            events.push(...trackEvents.events);
            offset = trackEvents.nextOffset;
        }
        
        // Sort events by time and convert to absolute timing
        events.sort((a, b) => a.time - b.time);
        
        // Convert ticks to seconds (assuming 120 BPM, 480 ticks per quarter note)
        const microsecondsPerQuarter = 500000; // 120 BPM
        const ticksPerQuarter = division;
        const microsecondsPerTick = microsecondsPerQuarter / ticksPerQuarter;
        
        let currentTime = 0;
        const timedEvents = [];
        
        for (const event of events) {
            currentTime = event.time * microsecondsPerTick / 1000000; // Convert to seconds
            timedEvents.push({
                ...event,
                time: currentTime
            });
        }
        
        return timedEvents;
    }
    
    parseTrack(view, offset) {
        const trackHeader = this.readString(view, offset, 4);
        if (trackHeader !== 'MTrk') {
            throw new Error('Invalid track header');
        }
        
        offset += 4;
        const trackLength = view.getUint32(offset);
        offset += 4;
        
        const events = [];
        const trackEnd = offset + trackLength;
        let currentTime = 0;
        let runningStatus = 0;
        
        while (offset < trackEnd) {
            // Read variable-length quantity (delta time)
            const deltaTime = this.readVariableLength(view, offset);
            offset = deltaTime.nextOffset;
            currentTime += deltaTime.value;
            
            // Read event
            let status = view.getUint8(offset);
            
            if (status < 0x80) {
                // Running status
                status = runningStatus;
                offset--; // Don't consume the byte
            } else {
                runningStatus = status;
            }
            
            offset++;
            
            const eventType = status & 0xF0;
            const channel = status & 0x0F;
            
            if (eventType === 0x90 || eventType === 0x80) {
                // Note On/Off
                const note = view.getUint8(offset++);
                const velocity = view.getUint8(offset++);
                
                events.push({
                    type: (eventType === 0x90 && velocity > 0) ? 'noteOn' : 'noteOff',
                    time: currentTime,
                    channel,
                    note,
                    velocity: velocity / 127.0
                });
            } else if (eventType === 0xB0) {
                // Control Change
                const controller = view.getUint8(offset++);
                const value = view.getUint8(offset++);
                
                events.push({
                    type: 'controlChange',
                    time: currentTime,
                    channel,
                    controller,
                    value
                });
            } else if (eventType === 0xFF) {
                // Meta event
                const metaType = view.getUint8(offset++);
                const length = this.readVariableLength(view, offset);
                offset = length.nextOffset;
                
                if (metaType === 0x2F) {
                    // End of track
                    offset += length.value;
                    break;
                } else {
                    // Skip meta event data
                    offset += length.value;
                }
            } else {
                // Skip other events
                if (eventType >= 0xC0 && eventType <= 0xDF) {
                    offset++; // Single byte parameter
                } else {
                    offset += 2; // Two byte parameters
                }
            }
        }
        
        return { events, nextOffset: trackEnd };
    }
    
    readString(view, offset, length) {
        let str = '';
        for (let i = 0; i < length; i++) {
            str += String.fromCharCode(view.getUint8(offset + i));
        }
        return str;
    }
    
    readVariableLength(view, offset) {
        let value = 0;
        let byte;
        let nextOffset = offset;
        
        do {
            byte = view.getUint8(nextOffset++);
            value = (value << 7) | (byte & 0x7F);
        } while (byte & 0x80);
        
        return { value, nextOffset };
    }
    
    calculateDuration() {
        if (this.events.length === 0) return 0;
        return Math.max(...this.events.map(e => e.time)) + 1; // Add 1 second buffer
    }
    
    play() {
        if (this.isPlaying) return;
        
        if (!this.audioContext) {
            this.initializeAudioContext();
        }
        
        // Resume audio context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.isPlaying = true;
        this.isPaused = false;
        this.startTime = this.audioContext.currentTime - this.currentTime;
        
        this.updatePlayButton();
        this.scheduleEvents();
        this.startProgressUpdate();
    }
    
    pause() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        this.isPaused = true;
        this.pauseTime = this.currentTime;
        
        this.clearTimeouts();
        this.stopAllNotes();
        this.updatePlayButton();
        this.stopProgressUpdate();
    }
    
    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTime = 0;
        
        this.clearTimeouts();
        this.stopAllNotes();
        this.updatePlayButton();
        this.updateProgress();
        this.stopProgressUpdate();
    }
    
    scheduleEvents() {
        this.clearTimeouts();
        
        const currentAudioTime = this.audioContext.currentTime;
        const noteStates = new Map(); // Track note on/off states for sustain
        
        for (const event of this.events) {
            if (event.time < this.currentTime) continue;
            
            const delay = (event.time - this.currentTime) * 1000;
            
            const timeout = setTimeout(() => {
                if (!this.isPlaying) return;
                
                if (event.type === 'noteOn') {
                    const noteId = this.playNote(event.note, event.velocity);
                    noteStates.set(event.note, noteId);
                } else if (event.type === 'noteOff') {
                    const noteId = noteStates.get(event.note);
                    if (noteId) {
                        this.stopNote(noteId);
                        noteStates.delete(event.note);
                    }
                } else if (event.type === 'controlChange' && event.controller === 64) {
                    // Sustain pedal
                    if (event.value < 64) {
                        // Sustain off - stop all currently held notes
                        for (const noteId of noteStates.values()) {
                            this.stopNote(noteId);
                        }
                        noteStates.clear();
                    }
                }
            }, delay);
            
            this.timeouts.push(timeout);
        }
        
        // Schedule stop at end
        const endTimeout = setTimeout(() => {
            this.stop();
        }, (this.duration - this.currentTime) * 1000);
        this.timeouts.push(endTimeout);
    }
    
    clearTimeouts() {
        this.timeouts.forEach(timeout => clearTimeout(timeout));
        this.timeouts = [];
    }
    
    startProgressUpdate() {
        this.progressInterval = setInterval(() => {
            if (this.isPlaying) {
                this.currentTime = this.audioContext.currentTime - this.startTime;
                this.updateProgress();
                
                if (this.currentTime >= this.duration) {
                    this.stop();
                }
            }
        }, 100);
    }
    
    stopProgressUpdate() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }
    
    seek(time) {
        const wasPlaying = this.isPlaying;
        
        if (wasPlaying) {
            this.pause();
        }
        
        this.currentTime = Math.max(0, Math.min(time, this.duration));
        this.updateProgress();
        
        if (wasPlaying) {
            this.play();
        }
    }
    
    createElement() {
        const container = document.createElement('div');
        container.className = 'midi-player-container';
        container.innerHTML = `
            <div class="midi-player-header">
                <div class="midi-file-info">
                    <div class="midi-file-name">🎵 ${this.escapeHtml(this.fileInfo.name)}</div>
                    <div class="midi-file-size">${this.formatFileSize(this.fileInfo.size)}</div>
                </div>
            </div>
            <div class="midi-player-controls">
                <button class="midi-play-btn" title="Play/Pause">▶️</button>
                <button class="midi-stop-btn" title="Stop">⏹️</button>
                <div class="midi-progress-container">
                    <div class="midi-progress-bar">
                        <div class="midi-progress-fill"></div>
                        <div class="midi-progress-handle"></div>
                    </div>
                    <div class="midi-time-display">
                        <span class="midi-current-time">0:00</span>
                        <span class="midi-duration">0:00</span>
                    </div>
                </div>
            </div>
            <div class="midi-error-message" style="display: none;"></div>
        `;
        
        this.setupEventListeners(container);
        return container;
    }
    
    setupEventListeners(container) {
        const playBtn = container.querySelector('.midi-play-btn');
        const stopBtn = container.querySelector('.midi-stop-btn');
        const progressBar = container.querySelector('.midi-progress-bar');
        
        playBtn.addEventListener('click', () => {
            if (this.isPlaying) {
                this.pause();
            } else {
                this.play();
            }
        });
        
        stopBtn.addEventListener('click', () => {
            this.stop();
        });
        
        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = x / rect.width;
            const time = percentage * this.duration;
            this.seek(time);
        });
    }
    
    updatePlayButton() {
        const playBtn = this.element.querySelector('.midi-play-btn');
        if (playBtn) {
            playBtn.textContent = this.isPlaying ? '⏸️' : '▶️';
            playBtn.title = this.isPlaying ? 'Pause' : 'Play';
        }
    }
    
    updateProgress() {
        const progressFill = this.element.querySelector('.midi-progress-fill');
        const currentTimeEl = this.element.querySelector('.midi-current-time');
        
        if (progressFill && this.duration > 0) {
            const percentage = (this.currentTime / this.duration) * 100;
            progressFill.style.width = `${percentage}%`;
        }
        
        if (currentTimeEl) {
            currentTimeEl.textContent = this.formatTime(this.currentTime);
        }
    }
    
    updateDurationDisplay() {
        const durationEl = this.element.querySelector('.midi-duration');
        if (durationEl) {
            durationEl.textContent = this.formatTime(this.duration);
        }
    }
    
    showError(message) {
        const errorEl = this.element.querySelector('.midi-error-message');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getElement() {
        return this.element;
    }
    
    destroy() {
        this.stop();
        this.stopProgressUpdate();
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}

export default MidiPlayer;
