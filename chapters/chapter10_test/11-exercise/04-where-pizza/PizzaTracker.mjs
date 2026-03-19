export class PizzaTracker {
    #db
    constructor(sql){
        this.#db = sql;  //createTable을 생성자 내에 넣지말고 명시적으로 적어두자. 
    }

    async placeOrder(id, customerName, pizzaType){
        await this.#db.query(`INSERT INTO orders(id, customerName, pizzaType, status, eta ) VALUES (?,?,?,?,?)` , [id, customerName, pizzaType, 'pending', null])
    }

    async getOrders(){
        return this.#db.query(`SELECT * FROM orders`)
    }

    async markAsDelivered(id){ //order id 기반으로 진행 
        await this.#db.query(`
            UPDATE orders
            SET status = "delivered"
            WHERE id = ?
            ` , [id])
    }

    async updateEta(id, eta){
        await this.#db.query(`
            UPDATE orders
            SET eta = ? 
            WHERE id = ?` , [eta, id])
    }
}

export async function createTables(sql){
    await sql.query(`CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY, 
        customerName TEXT NOT NULL, 
        pizzaType TEXT NOT NULL, 
        status TEXT NOT NULL CHECK(status IN ('pending' , 'delivered')), 
        eta INTEGER
    )`)
}
