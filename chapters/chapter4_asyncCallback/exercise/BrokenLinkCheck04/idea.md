Broken links checker: 

Write a checkBrokenLinks() function that takes a URL and a maximum depth level and reports any broken links (links returning a 404 status code) it encounters during the crawling process. 
You could start from the code we wrote for the web crawler and modify it so that, instead of downloading the content of the pages, it only checks for the HTTP status of each link. If the status code is 404, it should log the URL of the broken link and continue crawling other links. Tip: You could try using the HEAD method instead of GET when checking for links, as it only fetches the headers, which can speed up the process and reduce bandwidth usage.


function checkBrokenLinks(url , depth) {
    get(url)
}