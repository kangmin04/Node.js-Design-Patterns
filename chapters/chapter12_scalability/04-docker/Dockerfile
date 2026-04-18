#도커파일 시작 시 FROM으로 어떤 기초 이미지 사용할지 지정힘. (node24의 slim버젼(불필요한걸 제거한))
FROM node:24-slim 
#이 컨테이너가 실행될 때 8080 포트에서 연결을 수신할 예정이라는걸 알려줌. 
EXPOSE 8080
#COPY는 로컬 컴퓨터의 파일, 디렉토리(상대주소는 docker build 명령어 실행하는 위치 기준)를 이미지 안으로 복사시킴. 마지막에 대상이 옴.  
#/APP/은, 이미지 내부의 경로임. / 은 이미지 파일의 루트 폴더고, app/ 은 루트 디렉토리 아래에 app 디렉토리 만들고 그 안에 원본파일들 (app, package)를 복사하란 뜻
COPY app.mjs package.json /app/
#WORDIR은 이후 실행될 명령어의 기본 작업 디렉토리임. 
WORKDIR /app
#이미지 컨테이너의 시작할 때 기본으로 실행될 명령어임. npm start가 기본으로 실행됨. 
CMD ["npm", "start"]