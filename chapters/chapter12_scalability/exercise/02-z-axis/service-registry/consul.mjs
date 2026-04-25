export class ConsulClient {
  /* consul의 기본 HTTP API 포트는 항상 8500임
    다른 포트 주소로 하면 ECONNREFUSED 에러 뜸, 
  */
    constructor(baseUrl = 'http://localhost:8500') {
      this.baseUrl = baseUrl
    }
  
    async registerService({ name, id, address, port, tags = [] }) {
      const url = `${this.baseUrl}/v1/agent/service/register`
      const body = {
        Name: name,
        // biome-ignore lint/style/useNamingConvention: Consul API
        ID: id,
        // biome-ignore lint/style/useNamingConvention: Consul API
        Address: address,
        // biome-ignore lint/style/useNamingConvention: Consul API
        Port: port,
        // biome-ignore lint/style/useNamingConvention: Consul API
        Tags: tags,
        /* health check로직 설정 */
        Check : {
          HTTP: `http://${address}:${port}/health`,
          Interval: "10s",
          Timeout: "3s",
          DeregisterCriticalServiceAfter: "30s"
        }
      }
  
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
  
      if (!response.ok) {
        const responseText = await response.text() // Read the response body to get more details
        throw new Error(
          `Failed to register service: ${response.statusText}\n${responseText}`
        )
      }
    }
  
    async deregisterService(serviceId) {
      const url = `${this.baseUrl}/v1/agent/service/deregister/${serviceId}`
      const response = await fetch(url, { method: 'PUT' })
  
      if (!response.ok) {
        const responseText = await response.text()
        throw new Error(
          `Failed to deregister service: ${response.statusText}\n${responseText}`
        )
      }
    }
  
    async getAllServices() {
      const url = `${this.baseUrl}/v1/agent/services`
      const response = await fetch(url)
  
      if (!response.ok) {
        const responseText = await response.text()
        throw new Error(
          `Failed to get all services: ${response.statusText}\n${responseText}`
        )
      }
  
      return response.json()
    }
  }
