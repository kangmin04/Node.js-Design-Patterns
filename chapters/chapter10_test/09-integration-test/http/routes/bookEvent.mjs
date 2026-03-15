import { reserveSeat } from "../booking.mjs";

export function bookEventRoute(fastify){
    fastify.post('/events/:eventId/reservations' , {
        schema: { //schema에서 validate 오류 시 400 bad req로 reject 시킴 
            params: {
                type: 'object', 
                required: ['eventId'], 
                properties: {
                    eventId: {type: 'string'}
                }
            }, 
            body: {
                type: 'object', 
                required: ['userId'], 
                properties: {
                    userId: {type: 'string'}
                }
            }
        } , 
        async handler(request, reply) {
            const { eventId } = request.params
            const { userId } = request.body
      
            try {
              const reservationId = await reserveSeat(fastify.db, eventId, userId)
                return reply.status(201).send({ success: true, reservationId })
            } catch (err) {
              if (err.message === 'Event not found') {
                return reply.status(404).send({ error: 'Event not found' })
              }
      
              if (err.message === 'Event is fully booked') {
                return reply.status(403).send({ error: 'Event is fully booked' })
              }
      
              fastify.log.error(err)
              return reply.status(500).send({ error: 'Server error' })
            }
          },
        })
      }