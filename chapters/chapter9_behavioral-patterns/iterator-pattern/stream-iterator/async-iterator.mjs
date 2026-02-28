import split from "split2";
const stream = process.stdin.pipe(split()); 

for await (const line of stream) {
    console.log(`You wrote ${line}`);
 
  }
