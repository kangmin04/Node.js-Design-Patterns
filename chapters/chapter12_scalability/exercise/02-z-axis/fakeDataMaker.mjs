
import { faker } from '@faker-js/faker';
import { writeFile } from 'node:fs/promises';

export function createRandomUser() {
    return {
      userId: faker.string.uuid(),
      username: faker.internet.username(),
      email: faker.internet.email(),
      avatar: faker.image.avatar(),
      password: faker.internet.password(),
      birthdate: faker.date.birthdate(),
      registeredAt: faker.date.past(),
    };
  }
  
  function dataDivide(){
    const aTOd_users = [];
    const eTOp_users = [];
    const qTOz_users = [];
  
    const count = 45; 
  
    for(let i = 0; i < count ; i++){
      const user = createRandomUser(); 
      const username = user.username; 
      /* 보자마자 무조건 정규 표현식을 사용해야겠다 다짐했다. 
      BUT 다음처럼 ASCII 코드 비교를 통해서도 가능하다. 
       if (letter >= 'a' && letter <= 'd') {
      targetPort = INSTANCE_PORTS['a-d'];
      } else if (letter >= 'e' && letter <= 'p') {
      targetPort = INSTANCE_PORTS['e-p'];
      */
      if(/^[a-d]/i.test(username)){ 
        aTOd_users.push(user);
      }else if(/^[e-p]/i.test(username)){
        eTOp_users.push(user);
      }else { 
        qTOz_users.push(user);
      }
    }
    //JSON.stringify(배열, replacer, 공백) - 배열도 그냥 전체 넣으면 JSON화됨
    /* 이걸 모르고 처음엔 str으로 user 데이터 전체 넣고, 문자열 형태로 다루려했음....  */
    const aTOd_data = JSON.stringify(aTOd_users, null, 2);
    const eTOp_data = JSON.stringify(eTOp_users, null, 2);
    const qTOz_data = JSON.stringify(qTOz_users, null, 2);
  
    return {
      aTOd_data, 
      eTOp_data,
      qTOz_data
    }
  }

const {aTOd_data, eTOp_data, qTOz_data} = dataDivide(); 

await dataInit(); 
console.log('DATA PREPARING DONE')
  // export const users = faker.helpers.multiple(createRandomUser, {
  //   count: 30,
  // });

export async function dataInit(){
  try{
    await writeFile('AtoD.json', aTOd_data)
    await writeFile('EtoP.json', eTOp_data)
    await writeFile('QtoZ.json', qTOz_data)
      // await writeFile(fileDestination, JSON.stringify(users, null, 4))
    return true; 
  }catch(err){
      console.log(err)
  }
}