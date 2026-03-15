import { request } from "express";
import { createEvent } from "../booking.mjs";
export function createEventRoute(fastify){
    /* json schema를 통한 유효성 검사 */
    fastify.post('/events', {
        schema: {
            body: {
                type: 'object', 
                required: ['name', 'totalSeats'], 
                properties: {
                    name: {type: 'string'}, 
                    totalSeats: {type: 'integer'}
                }
            }
        } ,  
        async handler(request, reply){
            const {name, totalSeats} = request.body;  //클라이언트가 보낸 유효성 검시를 마친 데이터 
            const eventId = await createEvent(fastify.db, name, totalSeats)
            return reply.status(201).send({success: true, eventId})
        }
    })
}