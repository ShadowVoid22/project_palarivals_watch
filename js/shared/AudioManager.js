"use strict";

(function initializePalaRivalsAudio() {
  const SETTINGS_KEY = "palarivals-watch-audio-settings";
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  const MUSIC_SCENES = Object.freeze({
    menu: {
      title: "Crossworld Overture",
      bpm: 84,
      root: 48,
      scale: [0, 3, 5, 7, 10, 12],
      melody: [0, null, 2, null, 4, null, 3, null, 1, null, 3, null, 5, 4, 2, null],
      bass: [0, null, null, null, 3, null, null, null, 1, null, null, null, 4, null, 3, null],
      pulse: 0.032,
      pad: 0.022,
    },
    profile: {
      title: "Command Dossier",
      bpm: 72,
      root: 45,
      scale: [0, 2, 3, 7, 9, 12],
      melody: [0, null, null, 2, null, 3, null, null, 4, null, 3, null, 1, null, null, 2],
      bass: [0, null, null, null, 3, null, null, null, 4, null, null, null, 2, null, null, null],
      pulse: 0.022,
      pad: 0.026,
    },
    compendium: {
      title: "Archive of Three Worlds",
      bpm: 68,
      root: 47,
      scale: [0, 2, 5, 7, 9, 12],
      melody: [0, null, 2, null, 4, 3, null, 1, 2, null, 5, null, 4, 2, 1, null],
      bass: [0, null, null, null, 3, null, null, null, 1, null, null, null, 4, null, 2, null],
      pulse: 0.024,
      pad: 0.032,
    },
    build: {
      title: "Neon Assembly",
      bpm: 102,
      root: 43,
      scale: [0, 3, 5, 7, 10, 12],
      melody: [0, null, 2, 3, null, 4, 2, null, 1, null, 3, 5, 4, null, 3, 2],
      bass: [0, null, 0, null, 3, null, 3, null, 1, null, 1, null, 4, null, 3, null],
      pulse: 0.046,
      pad: 0.018,
    },
    combat: {
      title: "Final Formation",
      bpm: 138,
      root: 38,
      scale: [0, 1, 3, 5, 7, 10, 12],
      melody: [0, 2, null, 3, 4, null, 5, 3, 1, 2, null, 4, 6, 5, 3, 2],
      bass: [0, null, 0, 1, 3, null, 3, 4, 0, null, 0, 1, 5, 4, 3, 1],
      pulse: 0.058,
      pad: 0.014,
    },
  });

  const MAIN_MENU_PLAYLIST = Object.freeze([
    Object.freeze({
      ...MUSIC_SCENES.menu,
      title: "Crossworld Overture",
      trackSteps: 160,
    }),
    Object.freeze({
      title: "Neon Frontiers",
      bpm: 96,
      root: 43,
      scale: [0, 2, 3, 7, 9, 12],
      melody: [0, null, 2, 3, null, 5, 4, null, 2, null, 1, 3, 4, null, 2, 1],
      bass: [0, null, 0, null, 4, null, null, 4, 2, null, 2, null, 3, null, 1, null],
      pulse: 0.038,
      pad: 0.019,
      trackSteps: 160,
    }),
    Object.freeze({
      title: "Triad Protocol",
      bpm: 108,
      root: 40,
      scale: [0, 3, 5, 7, 8, 10, 12],
      melody: [0, 2, null, 3, 4, null, 2, 5, null, 4, 3, null, 1, 2, 4, null],
      bass: [0, null, 0, 3, null, 3, null, 4, 0, null, 1, null, 5, null, 3, null],
      pulse: 0.041,
      pad: 0.016,
      trackSteps: 160,
    }),
    Object.freeze({
      title: "Last Light Assembly",
      bpm: 78,
      root: 45,
      scale: [0, 2, 5, 7, 9, 12],
      melody: [0, null, null, 2, null, 3, 4, null, 5, null, 3, null, 2, 1, null, null],
      bass: [0, null, null, null, 3, null, null, null, 4, null, null, null, 2, null, 1, null],
      pulse: 0.028,
      pad: 0.03,
      trackSteps: 160,
    }),
  ]);

  const THEME_VARIANTS = Object.freeze({
    default: { transpose: 0, wave: "triangle", accentWave: "sawtooth", bassWave: "triangle", tempoScale: 1, rhythmGain: 1 },
    marvel: { transpose: -2, wave: "sawtooth", accentWave: "square", bassWave: "sawtooth", tempoScale: 1.04, rhythmGain: 1.18 },
    paladins: { transpose: 2, wave: "triangle", accentWave: "sine", bassWave: "triangle", tempoScale: 0.97, rhythmGain: 0.76 },
    overwatch: { transpose: 5, wave: "square", accentWave: "triangle", bassWave: "sawtooth", tempoScale: 1.07, rhythmGain: 1.3 },
  });

  function clamp(value, minimum = 0, maximum = 1) {
    return Math.min(maximum, Math.max(minimum, Number(value) || 0));
  }

  function midiToFrequency(note) {
    return 440 * (2 ** ((note - 69) / 12));
  }

  function readSettings() {
    const defaults = {
      musicEnabled: true,
      soundEnabled: true,
      musicVolume: 0.34,
      soundVolume: 0.72,
    };

    try {
      const savedSettings = JSON.parse(window.localStorage.getItem(SETTINGS_KEY));
      return {
        musicEnabled: savedSettings?.musicEnabled !== false,
        soundEnabled: savedSettings?.soundEnabled !== false,
        musicVolume: clamp(savedSettings?.musicVolume ?? defaults.musicVolume),
        soundVolume: clamp(savedSettings?.soundVolume ?? defaults.soundVolume),
      };
    } catch {
      return defaults;
    }
  }

  class PalaRivalsAudioEngine {
    constructor() {
      this.settings = readSettings();
      this.context = null;
      this.masterBus = null;
      this.musicBus = null;
      this.soundBus = null;
      this.compressor = null;
      this.noiseBuffer = null;
      this.scene = "menu";
      this.theme = "default";
      this.step = 0;
      this.playlistEnabled = false;
      this.playlistIndex = 0;
      this.playlistStep = 0;
      this.nextStepAt = 0;
      this.scheduler = null;
      this.unlocked = false;
      this.lastHoverAt = 0;
      this.controls = null;
    }

    saveSettings() {
      try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      } catch {
        // Audio remains usable when storage is blocked.
      }
    }

    ensureContext() {
      if (!AudioContextClass) {
        return false;
      }

      if (!this.context) {
        this.context = new AudioContextClass();
        this.masterBus = this.context.createGain();
        this.musicBus = this.context.createGain();
        this.soundBus = this.context.createGain();
        this.compressor = this.context.createDynamicsCompressor();
        this.compressor.threshold.value = -18;
        this.compressor.knee.value = 18;
        this.compressor.ratio.value = 5;
        this.compressor.attack.value = 0.004;
        this.compressor.release.value = 0.22;
        this.musicBus.connect(this.masterBus);
        this.soundBus.connect(this.masterBus);
        this.masterBus.connect(this.compressor);
        this.compressor.connect(this.context.destination);
        this.masterBus.gain.value = 0.82;
        this.noiseBuffer = this.createNoiseBuffer();
        this.applyBusLevels(true);
      }

      return true;
    }

    async unlock() {
      if (!this.ensureContext()) {
        this.updateControls();
        return false;
      }

      if (this.context.state !== "running") {
        try {
          await this.context.resume();
        } catch {
          return false;
        }
      }

      this.unlocked = this.context.state === "running";

      if (this.unlocked && !this.scheduler) {
        this.step = 0;
        this.nextStepAt = this.context.currentTime + 0.08;
        this.scheduler = window.setInterval(() => this.scheduleMusic(), 25);
        this.play("boot");
      }

      this.updateControls();
      return this.unlocked;
    }

    createNoiseBuffer() {
      const buffer = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
      const channel = buffer.getChannelData(0);

      for (let index = 0; index < channel.length; index += 1) {
        channel[index] = (Math.random() * 2) - 1;
      }

      return buffer;
    }

    applyBusLevels(immediate = false) {
      if (!this.context) {
        return;
      }

      const now = this.context.currentTime;
      const musicLevel = this.settings.musicEnabled ? this.settings.musicVolume : 0;
      const soundLevel = this.settings.soundEnabled ? this.settings.soundVolume : 0;

      [
        [this.musicBus.gain, musicLevel],
        [this.soundBus.gain, soundLevel],
      ].forEach(([gainParam, level]) => {
        gainParam.cancelScheduledValues(now);

        if (immediate) {
          gainParam.setValueAtTime(level, now);
        } else {
          gainParam.setTargetAtTime(level, now, 0.035);
        }
      });
    }

    makeTone({
      frequency,
      endFrequency = frequency,
      duration = 0.12,
      gain = 0.08,
      type = "sine",
      startAt = this.context.currentTime,
      destination = this.soundBus,
      filterFrequency = 9000,
      attack = 0.008,
    }) {
      if (!this.context || frequency <= 0) {
        return;
      }

      const oscillator = this.context.createOscillator();
      const filter = this.context.createBiquadFilter();
      const envelope = this.context.createGain();
      const stopAt = startAt + duration;

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), stopAt);
      filter.type = "lowpass";
      filter.frequency.value = filterFrequency;
      filter.Q.value = 0.7;
      envelope.gain.setValueAtTime(0.0001, startAt);
      envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), startAt + Math.min(attack, duration * 0.4));
      envelope.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      oscillator.connect(filter);
      filter.connect(envelope);
      envelope.connect(destination);
      oscillator.start(startAt);
      oscillator.stop(stopAt + 0.02);
    }

    makeNoise({
      duration = 0.08,
      gain = 0.05,
      startAt = this.context.currentTime,
      frequency = 1800,
      filterType = "bandpass",
      destination = this.soundBus,
    }) {
      if (!this.context || !this.noiseBuffer) {
        return;
      }

      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const envelope = this.context.createGain();
      const stopAt = startAt + duration;

      source.buffer = this.noiseBuffer;
      filter.type = filterType;
      filter.frequency.value = frequency;
      filter.Q.value = 0.9;
      envelope.gain.setValueAtTime(Math.max(0.0002, gain), startAt);
      envelope.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      source.connect(filter);
      filter.connect(envelope);
      envelope.connect(destination);
      source.start(startAt);
      source.stop(stopAt + 0.01);
    }

    playChord(notes, startAt, duration, gain, destination = this.musicBus, type = "triangle") {
      notes.forEach((note, index) => {
        this.makeTone({
          frequency: midiToFrequency(note),
          duration,
          gain: gain / Math.max(1, notes.length),
          type,
          startAt: startAt + (index * 0.012),
          destination,
          filterFrequency: 2100,
          attack: Math.min(0.12, duration * 0.18),
        });
      });
    }

    currentMusicScene() {
      if (this.playlistEnabled && this.scene === "menu") {
        return MAIN_MENU_PLAYLIST[this.playlistIndex] || MAIN_MENU_PLAYLIST[0];
      }

      return MUSIC_SCENES[this.scene] || MUSIC_SCENES.menu;
    }

    setPlaylist(playlistName) {
      this.playlistEnabled = playlistName === "main-menu" && this.scene === "menu";
      this.playlistIndex = 0;
      this.playlistStep = 0;
      this.step = 0;
      this.updateControls();
    }

    advancePlaylist({ manual = false } = {}) {
      if (!this.playlistEnabled) {
        return false;
      }

      this.playlistIndex = (this.playlistIndex + 1) % MAIN_MENU_PLAYLIST.length;
      this.playlistStep = 0;
      this.step = 0;

      if (manual && this.context) {
        const now = this.context.currentTime;
        this.nextStepAt = now + 0.1;
        this.musicBus.gain.cancelScheduledValues(now);
        this.musicBus.gain.setTargetAtTime(0, now, 0.025);
        this.musicBus.gain.setTargetAtTime(
          this.settings.musicEnabled ? this.settings.musicVolume : 0,
          now + 0.12,
          0.05,
        );
        this.play("themeSwitch");
      }

      this.updateControls();
      return true;
    }

    scheduleMusic() {
      if (!this.context || this.context.state !== "running") {
        return;
      }

      while (this.nextStepAt < this.context.currentTime + 0.13) {
        const scene = this.currentMusicScene();
        const variant = THEME_VARIANTS[this.theme] || THEME_VARIANTS.default;
        const tempoScale = this.playlistEnabled ? variant.tempoScale : 1;
        const secondsPerStep = (60 / (scene.bpm * tempoScale)) / 4;
        this.scheduleMusicStep(scene, this.step, this.nextStepAt, secondsPerStep);
        this.step = (this.step + 1) % 16;
        this.playlistStep += 1;
        this.nextStepAt += secondsPerStep;

        if (this.playlistEnabled && this.playlistStep >= scene.trackSteps) {
          this.advancePlaylist();
        }
      }
    }

    scheduleMusicStep(scene, step, startAt, stepDuration) {
      const variant = THEME_VARIANTS[this.theme] || THEME_VARIANTS.default;
      const transpose = variant.transpose;
      const melodyDegree = scene.melody[step];
      const bassDegree = scene.bass[step];

      if (melodyDegree !== null) {
        const melodyNote = scene.root + 12 + scene.scale[melodyDegree % scene.scale.length] + transpose;
        this.makeTone({
          frequency: midiToFrequency(melodyNote),
          duration: stepDuration * (this.scene === "combat" ? 1.2 : 1.8),
          gain: scene.pulse,
          type: variant.accentWave,
          startAt,
          destination: this.musicBus,
          filterFrequency: this.scene === "combat" ? 2900 : 2200,
        });
      }

      if (bassDegree !== null) {
        const bassNote = scene.root - 12 + scene.scale[bassDegree % scene.scale.length] + transpose;
        this.makeTone({
          frequency: midiToFrequency(bassNote),
          endFrequency: midiToFrequency(bassNote - (this.scene === "combat" ? 5 : 1)),
          duration: stepDuration * 3.1,
          gain: scene.pulse * 1.25,
          type: this.playlistEnabled ? variant.bassWave : "sawtooth",
          startAt,
          destination: this.musicBus,
          filterFrequency: 460,
          attack: 0.01,
        });
      }

      if (step === 0 || step === 8) {
        const chordRoot = scene.root + transpose + (step === 8 ? scene.scale[3] : 0);
        this.playChord(
          [chordRoot, chordRoot + 7, chordRoot + (this.scene === "profile" ? 14 : 15)],
          startAt,
          stepDuration * 7.5,
          scene.pad,
          this.musicBus,
          variant.wave,
        );
      }

      if (this.playlistEnabled) {
        if (step % 4 === 0) {
          this.makeTone({
            frequency: this.theme === "overwatch" ? 118 : 92,
            endFrequency: 48,
            duration: 0.11,
            gain: 0.026 * variant.rhythmGain,
            type: "sine",
            startAt,
            destination: this.musicBus,
            filterFrequency: 480,
          });
        }

        if (step === 6 || step === 14) {
          this.makeNoise({
            duration: this.theme === "paladins" ? 0.08 : 0.045,
            gain: 0.012 * variant.rhythmGain,
            startAt,
            frequency: this.theme === "marvel" ? 2200 : 4200,
            filterType: this.theme === "paladins" ? "bandpass" : "highpass",
            destination: this.musicBus,
          });
        }
      }

      if (this.scene === "build" || this.scene === "combat") {
        if (step % 4 === 0) {
          this.makeTone({
            frequency: this.scene === "combat" ? 105 : 92,
            endFrequency: 42,
            duration: 0.13,
            gain: this.scene === "combat" ? 0.075 : 0.045,
            type: "sine",
            startAt,
            destination: this.musicBus,
            filterFrequency: 500,
          });
        }

        if (step === 4 || step === 12) {
          this.makeNoise({
            duration: this.scene === "combat" ? 0.11 : 0.07,
            gain: this.scene === "combat" ? 0.038 : 0.022,
            startAt,
            frequency: 1600,
            destination: this.musicBus,
          });
        }

        if (this.scene === "combat" && step % 2 === 1) {
          this.makeNoise({
            duration: 0.025,
            gain: 0.012,
            startAt,
            frequency: 6200,
            filterType: "highpass",
            destination: this.musicBus,
          });
        }
      }

      if (this.scene === "compendium") {
        if (step === 3 || step === 7 || step === 11 || step === 15) {
          const scanNote = scene.root + 24 + scene.scale[(step + 1) % scene.scale.length];
          this.makeTone({
            frequency: midiToFrequency(scanNote),
            endFrequency: midiToFrequency(scanNote + 5),
            duration: stepDuration * 0.7,
            gain: 0.014,
            type: "sine",
            startAt,
            destination: this.musicBus,
            filterFrequency: 3600,
          });
        }

        if (step === 0 || step === 8) {
          this.makeNoise({
            duration: 0.14,
            gain: 0.007,
            startAt,
            frequency: 5200,
            filterType: "highpass",
            destination: this.musicBus,
          });
        }
      }
    }

    setScene(sceneName) {
      if (!MUSIC_SCENES[sceneName] || this.scene === sceneName) {
        this.updateControls();
        return;
      }

      this.scene = sceneName;
      this.step = 0;
      this.playlistStep = 0;

      if (this.context) {
        this.nextStepAt = this.context.currentTime + 0.08;
        this.musicBus.gain.cancelScheduledValues(this.context.currentTime);
        this.musicBus.gain.setTargetAtTime(0, this.context.currentTime, 0.025);
        this.musicBus.gain.setTargetAtTime(
          this.settings.musicEnabled ? this.settings.musicVolume : 0,
          this.context.currentTime + 0.12,
          0.05,
        );
      }

      this.updateControls();
    }

    setTheme(themeName) {
      if (THEME_VARIANTS[themeName]) {
        this.theme = themeName;
        this.step = 0;
        this.play("themeSwitch");
        this.updateControls();
      }
    }

    play(effectName, options = {}) {
      if (!this.unlocked || !this.context || !this.settings.soundEnabled) {
        return;
      }

      const now = this.context.currentTime;
      const tone = (frequency, duration, gain, type = "sine", delay = 0, endFrequency = frequency) => {
        this.makeTone({
          frequency,
          endFrequency,
          duration,
          gain,
          type,
          startAt: now + delay,
          destination: this.soundBus,
          filterFrequency: options.filterFrequency || 9000,
        });
      };
      const noise = (duration, gain, frequency, delay = 0, filterType = "bandpass") => {
        this.makeNoise({ duration, gain, frequency, filterType, startAt: now + delay, destination: this.soundBus });
      };

      switch (effectName) {
        case "hover":
          if (performance.now() - this.lastHoverAt < 55) return;
          this.lastHoverAt = performance.now();
          tone(880, 0.035, 0.025, "sine", 0, 1180);
          break;
        case "click":
          tone(250, 0.045, 0.05, "square", 0, 190);
          noise(0.025, 0.022, 3600);
          break;
        case "boot":
          tone(220, 0.14, 0.045, "sine", 0, 440);
          tone(554, 0.18, 0.035, "triangle", 0.08, 740);
          break;
        case "themeSwitch":
          tone(360, 0.1, 0.045, "triangle", 0, 720);
          tone(920, 0.12, 0.03, "sine", 0.07, 1380);
          break;
        case "purchase":
          tone(420, 0.1, 0.07, "triangle", 0, 620);
          tone(840, 0.13, 0.055, "sine", 0.07, 1180);
          noise(0.045, 0.02, 5200, 0.05, "highpass");
          break;
        case "deploy":
          tone(118, 0.18, 0.09, "sine", 0, 62);
          tone(520, 0.12, 0.05, "square", 0.04, 760);
          noise(0.08, 0.035, 900);
          break;
        case "reroll":
          [420, 560, 720, 960].forEach((frequency, index) => tone(frequency, 0.07, 0.038, "triangle", index * 0.045, frequency * 1.12));
          noise(0.13, 0.025, 2800);
          break;
        case "freeze":
          [1240, 980, 760].forEach((frequency, index) => tone(frequency, 0.2, 0.035, "sine", index * 0.045, frequency * 0.88));
          noise(0.16, 0.018, 6400, 0, "highpass");
          break;
        case "unfreeze":
          [620, 820, 1120].forEach((frequency, index) => tone(frequency, 0.12, 0.032, "triangle", index * 0.045, frequency * 1.08));
          break;
        case "upgrade":
        case "merge":
        case "levelUp":
          [330, 440, 554, 659].forEach((frequency, index) => tone(frequency, 0.18, 0.052, index % 2 ? "triangle" : "sine", index * 0.075, frequency * 1.04));
          tone(1320, 0.26, 0.035, "sine", 0.28, 1760);
          break;
        case "sell":
          tone(1120, 0.08, 0.052, "square", 0, 920);
          tone(1480, 0.13, 0.045, "sine", 0.07, 1180);
          break;
        case "ready":
          tone(440, 0.1, 0.06, "square", 0, 660);
          tone(880, 0.2, 0.055, "triangle", 0.09, 990);
          break;
        case "unready":
          tone(620, 0.11, 0.045, "triangle", 0, 310);
          break;
        case "combatStart":
          tone(96, 0.45, 0.12, "sawtooth", 0, 48);
          noise(0.28, 0.07, 720, 0.03);
          [220, 277, 330].forEach((frequency, index) => tone(frequency, 0.28, 0.05, "square", 0.12 + (index * 0.055), frequency * 1.08));
          break;
        case "attack":
          tone(options.critical ? 180 : 130, 0.11, options.critical ? 0.1 : 0.07, "sawtooth", 0, 62);
          noise(0.08, options.critical ? 0.075 : 0.045, options.critical ? 1700 : 1100);
          break;
        case "critical":
          tone(190, 0.18, 0.12, "square", 0, 55);
          tone(920, 0.11, 0.065, "sawtooth", 0.015, 420);
          noise(0.16, 0.09, 1400);
          break;
        case "dodge":
          tone(460, 0.14, 0.055, "sine", 0, 1480);
          noise(0.1, 0.028, 5400, 0, "highpass");
          break;
        case "heal":
          [520, 660, 880].forEach((frequency, index) => tone(frequency, 0.2, 0.038, "sine", index * 0.055, frequency * 1.2));
          break;
        case "knockout":
          tone(120, 0.42, 0.14, "sawtooth", 0, 34);
          noise(0.24, 0.1, 640);
          tone(740, 0.18, 0.055, "square", 0.03, 110);
          break;
        case "victory":
          [262, 330, 392, 523].forEach((frequency, index) => tone(frequency, 0.42, 0.065, "triangle", index * 0.12, frequency * 1.02));
          this.playChord([60, 64, 67, 72], now + 0.48, 0.75, 0.25, this.soundBus, "sawtooth");
          break;
        case "defeat":
          [330, 294, 247, 196].forEach((frequency, index) => tone(frequency, 0.35, 0.06, "sawtooth", index * 0.12, frequency * 0.82));
          noise(0.5, 0.045, 360, 0.3);
          break;
        case "error":
          tone(150, 0.09, 0.06, "square", 0, 118);
          tone(142, 0.09, 0.05, "square", 0.1, 108);
          break;
        case "modalOpen":
          tone(280, 0.15, 0.045, "triangle", 0, 180);
          noise(0.08, 0.025, 1300);
          break;
        case "modalClose":
          tone(240, 0.1, 0.035, "sine", 0, 480);
          break;
        case "fileOpen":
          tone(310, 0.16, 0.045, "triangle", 0, 520);
          tone(620, 0.19, 0.038, "sine", 0.055, 930);
          tone(1120, 0.22, 0.025, "sine", 0.115, 1480);
          noise(0.12, 0.018, 4300, 0.035, "highpass");
          break;
        case "fileClose":
          tone(760, 0.12, 0.032, "sine", 0, 470);
          tone(390, 0.16, 0.03, "triangle", 0.055, 220);
          noise(0.08, 0.012, 2600, 0, "highpass");
          break;
        case "filter":
          tone(690, 0.045, 0.022, "sine", 0, 920);
          break;
        default:
          break;
      }
    }

    toggleMusic() {
      this.settings.musicEnabled = !this.settings.musicEnabled;
      this.saveSettings();
      this.applyBusLevels();
      this.updateControls();
    }

    toggleSound() {
      this.settings.soundEnabled = !this.settings.soundEnabled;
      this.saveSettings();
      this.applyBusLevels();
      this.updateControls();
    }

    setMusicVolume(value) {
      this.settings.musicVolume = clamp(value);
      this.settings.musicEnabled = this.settings.musicVolume > 0;
      this.saveSettings();
      this.applyBusLevels();
      this.updateControls();
    }

    setSoundVolume(value) {
      this.settings.soundVolume = clamp(value);
      this.settings.soundEnabled = this.settings.soundVolume > 0;
      this.saveSettings();
      this.applyBusLevels();
      this.updateControls();
    }

    mountControls() {
      if (document.querySelector("#prwAudioDock")) {
        return;
      }

      const dock = document.createElement("aside");
      dock.className = "prw-audio-dock";
      dock.id = "prwAudioDock";
      dock.innerHTML = `
        <button class="prw-audio-dock__toggle" id="prwAudioPanelToggle" type="button" aria-expanded="false" aria-controls="prwAudioPanel" aria-label="Open audio controls">
          <span aria-hidden="true"><i></i><i></i><i></i></span>
          <b>Audio</b>
        </button>
        <section class="prw-audio-panel" id="prwAudioPanel" hidden aria-label="Audio controls">
          <header>
            <span>Soundtrack // Now Playing</span>
            <strong id="prwAudioTrack">Crossworld Overture</strong>
            <small id="prwAudioStatus">Interact to enable audio</small>
            <div class="prw-audio-panel__playlist" id="prwAudioPlaylist" hidden>
              <span id="prwAudioPlaylistPosition">01 / 04</span>
              <button id="prwAudioNextTrack" type="button">Next track <b aria-hidden="true">&#8594;</b></button>
            </div>
          </header>
          <div class="prw-audio-panel__row">
            <button id="prwMusicToggle" type="button" aria-pressed="true"><span>Music</span><b>On</b></button>
            <label><span>Music volume</span><input id="prwMusicVolume" type="range" min="0" max="100" step="1" aria-label="Music volume"></label>
          </div>
          <div class="prw-audio-panel__row">
            <button id="prwSoundToggle" type="button" aria-pressed="true"><span>Effects</span><b>On</b></button>
            <label><span>Sound effects volume</span><input id="prwSoundVolume" type="range" min="0" max="100" step="1" aria-label="Sound effects volume"></label>
          </div>
        </section>
      `;
      document.body.append(dock);
      this.controls = {
        dock,
        panel: dock.querySelector("#prwAudioPanel"),
        panelToggle: dock.querySelector("#prwAudioPanelToggle"),
        track: dock.querySelector("#prwAudioTrack"),
        status: dock.querySelector("#prwAudioStatus"),
        playlist: dock.querySelector("#prwAudioPlaylist"),
        playlistPosition: dock.querySelector("#prwAudioPlaylistPosition"),
        nextTrack: dock.querySelector("#prwAudioNextTrack"),
        musicToggle: dock.querySelector("#prwMusicToggle"),
        soundToggle: dock.querySelector("#prwSoundToggle"),
        musicVolume: dock.querySelector("#prwMusicVolume"),
        soundVolume: dock.querySelector("#prwSoundVolume"),
      };

      this.controls.panelToggle.addEventListener("click", async () => {
        await this.unlock();
        const opening = this.controls.panel.hidden;
        this.controls.panel.hidden = !opening;
        this.controls.panelToggle.setAttribute("aria-expanded", String(opening));
        this.controls.panelToggle.setAttribute("aria-label", `${opening ? "Close" : "Open"} audio controls`);
      });
      this.controls.musicToggle.addEventListener("click", () => this.toggleMusic());
      this.controls.soundToggle.addEventListener("click", () => this.toggleSound());
      this.controls.nextTrack.addEventListener("click", async () => {
        await this.unlock();
        this.advancePlaylist({ manual: true });
      });
      this.controls.musicVolume.addEventListener("input", (event) => this.setMusicVolume(Number(event.target.value) / 100));
      this.controls.soundVolume.addEventListener("input", (event) => this.setSoundVolume(Number(event.target.value) / 100));
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !this.controls.panel.hidden) {
          this.controls.panel.hidden = true;
          this.controls.panelToggle.setAttribute("aria-expanded", "false");
        }
      });
      this.updateControls();
    }

    updateControls() {
      if (!this.controls) {
        return;
      }

      const scene = this.currentMusicScene();
      const variant = THEME_VARIANTS[this.theme] || THEME_VARIANTS.default;
      const effectiveBpm = Math.round(scene.bpm * (this.playlistEnabled ? variant.tempoScale : 1));
      this.controls.track.textContent = scene.title;
      this.controls.status.textContent = AudioContextClass
        ? (this.unlocked ? `${this.theme.toUpperCase()} mix // ${effectiveBpm} BPM` : "Interact to enable audio")
        : "Web Audio unavailable";
      this.controls.playlist.hidden = !this.playlistEnabled;
      this.controls.playlistPosition.textContent = `${String(this.playlistIndex + 1).padStart(2, "0")} / ${String(MAIN_MENU_PLAYLIST.length).padStart(2, "0")}`;
      this.controls.musicToggle.setAttribute("aria-pressed", String(this.settings.musicEnabled));
      this.controls.musicToggle.querySelector("b").textContent = this.settings.musicEnabled ? "On" : "Off";
      this.controls.soundToggle.setAttribute("aria-pressed", String(this.settings.soundEnabled));
      this.controls.soundToggle.querySelector("b").textContent = this.settings.soundEnabled ? "On" : "Off";
      this.controls.musicVolume.value = Math.round(this.settings.musicVolume * 100);
      this.controls.soundVolume.value = Math.round(this.settings.soundVolume * 100);
      this.controls.dock.classList.toggle("prw-audio-dock--active", this.unlocked && (this.settings.musicEnabled || this.settings.soundEnabled));
    }
  }

  const engine = new PalaRivalsAudioEngine();
  const publicApi = {
    unlock: () => engine.unlock(),
    play: (effectName, options) => engine.play(effectName, options),
    setScene: (sceneName) => engine.setScene(sceneName),
    setTheme: (themeName) => engine.setTheme(themeName),
    nextTrack: () => engine.advancePlaylist({ manual: true }),
    getSettings: () => ({ ...engine.settings }),
    getStatus: () => ({
      unlocked: engine.unlocked,
      scene: engine.scene,
      theme: engine.theme,
      contextState: engine.context?.state || "not-created",
      schedulerActive: Boolean(engine.scheduler),
      playlistEnabled: engine.playlistEnabled,
      playlistIndex: engine.playlistIndex,
      playlistLength: MAIN_MENU_PLAYLIST.length,
      track: engine.currentMusicScene().title,
    }),
  };

  window.PRWAudio = publicApi;

  function mountAudioSystem() {
    engine.mountControls();
    const requestedScene = document.body.dataset.audioScene;
    const requestedTheme = document.body.dataset.theme;
    const requestedPlaylist = document.body.dataset.audioPlaylist;
    engine.setScene(MUSIC_SCENES[requestedScene] ? requestedScene : "menu");
    engine.setPlaylist(requestedPlaylist);
    engine.setTheme(THEME_VARIANTS[requestedTheme] ? requestedTheme : "default");

    const unlockFromGesture = () => engine.unlock();
    document.addEventListener("pointerdown", unlockFromGesture, { capture: true, once: true });
    document.addEventListener("keydown", unlockFromGesture, { capture: true, once: true });
    document.addEventListener("pointerover", (event) => {
      if (event.target.closest("button, a, [role='button']")) {
        engine.play("hover");
      }
    });
    document.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button, a, [role='button']")) {
        engine.play("click");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAudioSystem, { once: true });
  } else {
    mountAudioSystem();
  }
}());
