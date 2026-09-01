import js from "@eslint/js";
import globals from "globals";

// 학습용 예제 스크립트 저장소라 규칙은 "명백한 버그" 위주로 최소화한다.
// TypeScript 파일(chapter10_test/10-e2e-test)은 기본적으로 lint 대상에서 제외된다.
export default [
    {
        ignores: ["node_modules/**", "docs/**", "**/playwright-report/**", "**/test-results/**"],
    },
    js.configs.recommended,
    {
        files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.node,
            },
        },
        rules: {
            "no-unused-vars": "warn",
        },
    },
    {
        // public/ 아래는 브라우저에서 <script>로 로드되는 클라이언트 스크립트다.
        files: ["**/public/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.browser,
                io: "readonly", // socket.io client script(CDN/서버 정적 파일)가 전역으로 주입
            },
        },
    },
];
