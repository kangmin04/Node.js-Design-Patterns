
import { Readable } from 'node:stream';
import { stdout } from 'node:process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const frameFileNames = readdirSync('frames');
const frames = frameFileNames.map(fileName => 
  readFileSync(join('./frames', fileName), 'utf-8')
);

// 2. ANSI 이스케이프 코드 정의
const CLEAR_SCREEN = '\x1B[2J';
const CURSOR_TO_HOME = '\x1B[H';
const RESET_COLOR = '\x1B[0m';

const colors = [
  '\x1B[31m', // 빨강
  '\x1B[32m', // 초록
  '\x1B[33m', // 노랑
  '\x1B[34m', // 파랑
  '\x1B[35m', // 마젠타
  '\x1B[36m'  // 시안
];

class AnimationStream extends Readable {
  constructor(frames, options) {
    super(options);
    this.frames = frames;
    this.index = 0;
    this.frameRate = 70;
  }

  _read() {
    const frame = this.frames[this.index];
    const color = colors[this.index % colors.length];

    const data = `${CLEAR_SCREEN}${CURSOR_TO_HOME}${color}${frame}${RESET_COLOR}`;

    setTimeout(() => {
      this.push(data);
      this.index++;
      if (this.index === this.frames.length) {
        this.index = 0;
      }
    }, this.frameRate);
  }
}

const animation = new AnimationStream(frames);

animation.pipe(stdout);

console.log('Running colorful parrot animation... Press Ctrl+C to stop.');
