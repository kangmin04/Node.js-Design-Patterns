import { ReplaceStream } from "./replaceStream.mjs";


process.stdin
    .pipe(new ReplaceStream(process.argv[2] , process.argv[3])) //argv index 주의하자. node[0] replace.mjs[1] World[2] Node[3]임 
    .pipe(process.stdout)