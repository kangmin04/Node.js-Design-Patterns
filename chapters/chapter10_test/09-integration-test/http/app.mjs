import fastify from "fastify";

export async function createApp(db){
    const app = fastify();
    app.decorate('db', db) /* 라우터 등에서 fastify.db로 두번째 인자에 담긴 db 접근 가능 */

    return app
}