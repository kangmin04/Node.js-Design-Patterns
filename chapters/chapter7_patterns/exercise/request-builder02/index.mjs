import { RequestBuilder } from './requestBuilder.mjs';

async function main() {
  // A simple GET request to a public API
  try {
    console.log('--- Performing a simple GET request ---');
    const getBuilder = new RequestBuilder();
    const getResult = await getBuilder
      .method('GET')
      .url('https://jsonplaceholder.typicode.com/posts/1')
      .invoke();

    console.log(`Status: ${getResult.statusCode}`);
    console.log('Body:', JSON.parse(getResult.body));
  } catch (error) {
    console.error('GET Request Failed:', error.message);
  }

  console.log('\n----------------------------------------\n');

  // A POST request with a body and custom headers
  try {
    console.log('--- Performing a POST request with body and auth ---');
    const postBuilder = new RequestBuilder();
    const postResult = await postBuilder
      .method('POST')
      .url('https://jsonplaceholder.typicode.com/posts')
      .auth('myuser', 'mypass') // Dummy auth
      .header('X-Custom-Header', 'MyBuilderTest')
      .query('source', 'builder')
      .body({ 
        title: 'foo',
        body: 'bar',
        userId: 1
       })
      .timeout(2000) // 2 seconds timeout
      .invoke();

    console.log(`Status: ${postResult.statusCode}`);
    console.log('Headers contain custom header:', postResult.headers['x-custom-header']);
    console.log('Body:', JSON.parse(postResult.body));

  } catch (error) {
    console.error('POST Request Failed:', error.message);
  }
}

main();
