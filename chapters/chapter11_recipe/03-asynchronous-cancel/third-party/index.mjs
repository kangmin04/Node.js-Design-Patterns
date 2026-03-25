/*
    simple, wrapper 방식 전부 내부의 cancellation object를 manual하게 config. 
    BUT third party의 경우 각각 다른 mechanism으로 구성되고, 해당 cancellation obj를 접근 불가할수도
    --> standard library. AbortController
*/

const ac = new AbortController()
