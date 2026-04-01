import { cpus as _cpus } from 'node:os'

// 1. 시작 스냅샷을 찍는 함수
function getCpuTimes () {
  const cpus = _cpus()
  // 코어별로 times 객체만 추출하여 배열로 반환
  return cpus.map(cpu => cpu.times)
}

function calculateUsage (start, end) {
  for (let i = 0; i < start.length; i++) {
    const startTimes = start[i]
    const endTimes = end[i]

    // 4. 각 시간 유형별 변화량 계산
    const user = endTimes.user - startTimes.user
    const nice = endTimes.nice - startTimes.nice
    const sys = endTimes.sys - startTimes.sys
    const idle = endTimes.idle - startTimes.idle
    const irq = endTimes.irq - startTimes.irq

    // 5. 총 소요 시간과 실제 작업 시간 계산
    const total = user + nice + sys + idle + irq

    if (total === 0) {
      console.log(`Core ${i + 1}: 0% (No activity)`)
      continue
    }

    const work = total - idle
    const usage = (work / total) * 100

    console.log(`Core ${i + 1}: ${usage.toFixed(2)}%`)
  }
}

console.log('Calculating CPU usage over 1 second...')

// 1. 시작 스냅샷 저장
const startTimes = getCpuTimes()

// 2. 1초 동안 대기 (이 시간 동안 다른 터미널에서 curl 요청을 보내면, 그 부하가 측정됩니다)
setTimeout(() => {
  // 3. 1초 뒤 종료 스냅샷 저장
  const endTimes = getCpuTimes()
  
  console.log('--- CPU Usage ---')
  calculateUsage(startTimes, endTimes)
  console.log('-----------------')
}, 1000)
