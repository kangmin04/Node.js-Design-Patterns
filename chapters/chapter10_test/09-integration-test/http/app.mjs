import fastify from "fastify";
import { bookEventRoute } from "./routes/bookEvent.mjs";
import { createEventRoute } from "./routes/createEvent.mjs";

export async function createApp(db){
    const app = fastify();
    app.decorate('db', db) /* 라우터 등에서 fastify.db로 두번째 인자에 담긴 db 접근 가능 */
    await app.register(bookEventRoute)
    await app.register(createEventRoute)
    return app
}