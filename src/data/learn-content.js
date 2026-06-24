// src/data/learn-content.js
// Learn library INDEX — composes the per-module content files in src/data/learn/.
// Each module file holds one module's lessons; this file just orders them into the
// MODULES array the Learn tab + utils/learn.js consume.
//
// Voice: NO author names (#24) — principles are taught first-party. Each lesson has
// a hand-authored quiz with a single `correctIdx` (#25, quiz-gated completion).
// A7 (0f-content) expanded the A5 seed to 9 modules / ~50 lessons.
//
// Shape:
//   module = { id, icon, title, sub, lessons: [lesson] }
//   lesson = { id, title, minutes, body: [paragraph], insight, quiz }
//   quiz   = { q, options: [string], correctIdx }

import { markets } from "./learn/markets.js";
import { fundamentals } from "./learn/fundamentals.js";
import { tokenomics } from "./learn/tokenomics.js";
import { demand } from "./learn/demand.js";
import { yieldModule } from "./learn/yield.js";
import { risk } from "./learn/risk.js";
import { psychology } from "./learn/psychology.js";
import { security } from "./learn/security.js";
import { thesis } from "./learn/thesis.js";

export const MODULES = [
  markets,
  fundamentals,
  tokenomics,
  demand,
  yieldModule,
  risk,
  psychology,
  security,
  thesis,
];
