import {test, suite} from 'node:test'

test('A skipped test', (t) => {
    t.skip(true)
})


test('A todo test', (t) => {
    t.todo(true)
})

/*
    t.skip: 
    t.skip()은 이미 작성되었지만, 특정 이유로 잠시 실행하고 싶지 않은 테스트를 건너뛸 때 사용합니다. 
    예를 들어, 버그로 인해 실패하는 테스트나 아직 고쳐지지 않은 기능을 검사하는 테스트를 임시로 비활성화하는 데 유용

    t.todo: 
    t.todo()는 아직 작성되지 않았지만, 앞으로 작성해야 할 테스트를 표시할 때 사용
    "나중에 이 테스트 만들어야지"라고 표시해두는, 말 그대로 '할 일(To-do)' 목록 같은 개념

    t.only:
    exclusive test용
*/