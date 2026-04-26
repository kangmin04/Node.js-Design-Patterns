import winston from 'winston'

const { combine, timestamp, json, printf, colorize } = winston.format

const logFormat = printf(({ level, message, timestamp, service, ...metadata }) => {
  let msg = `${timestamp} [${service}] ${level}: ${message}`
  // 추가 정보(metadata)가 있으면 JSON 형태로 덧붙입니다.
  if (Object.keys(metadata).length) {
    msg += ` ${JSON.stringify(metadata)}`
  }
  return msg
})

const logger = winston.createLogger({
  // 'info' 레벨 이상의 로그 (info, warn, error)
  level: 'info',

  format: combine(
    colorize(), // 로그 레벨에 따라 색상 적용
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // 시간 자동 기록
    logFormat // 위에서 정의한 포맷 사용
  ),
  // 모든 로그에 'load-balancer'라는 서비스 이름을 기본으로 추가합니다.
  defaultMeta: { service: 'load-balancer' },
  // 로그를 어디에 저장할지 설정 (File, Console ... )
  transports: [
    new winston.transports.Console()
    // 필요하다면 파일로도 저장할 수 있습니다.
    , new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'combined.log' })
  ]
})

export default logger
