// command-undo-queue-example.js

// 1. Receiver: 실제 연산을 수행하는 객체
class Calculator {
  constructor() {
    this.currentValue = 0;
  }

  execute(operator, value) {
    switch (operator) {
      case '+':
        this.currentValue += value;
        break;
      case '-':
        this.currentValue -= value;
        break;
      case '*':
        this.currentValue *= value;
        break;
      case '/':
        this.currentValue /= value;
        break;
    }
    console.log(`Current Value: ${this.currentValue}`);
  }
}

// 2. Command: 요청(연산)을 캡슐화하는 객체
// undo 기능을 위해 어떤 연산을 했는지, 그리고 그 반대 연산은 무엇인지 알아야 함
class CalculatorCommand {
  constructor(calculator, operator, value) {
    this.calculator = calculator;
    this.operator = operator;
    this.value = value;
  }

  // 이 명령을 실행하는 메서드
  execute() {
    this.calculator.execute(this.operator, this.value);
  }

  // 이 명령을 되돌리는(undo) 메서드
  undo() {
    const undoOperator = this.getUndoOperator(this.operator);
    this.calculator.execute(undoOperator, this.value);
  }

  getUndoOperator(operator) {
    switch (operator) {
      case '+': return '-';
      case '-': return '+';
      case '*': return '/';
      case '/': return '*';
    }
  }
}

// 3. Invoker: 명령을 호출하고 관리하는 객체
class CommandManager {
  constructor() {
    this.taskQueue = []; // 작업 큐
    this.history = [];   // Undo를 위한 실행 기록
  }

  // --- 직접 실행 및 Undo 기능 ---
  executeCommand(command) {
    command.execute();
    // 실행된 명령은 history에 추가하여 undo를 대비
    this.history.push(command);
  }

  undo() {
    if (this.history.length === 0) {
      console.log("Undo history is empty.");
      return;
    }
    console.log("--- Undoing last action ---");
    const lastCommand = this.history.pop();
    lastCommand.undo();
    console.log("-------------------------");
  }

  // --- 작업 큐 기능 ---
  addToQueue(command) {
    this.taskQueue.push(command);
    console.log(`Task added to queue. Queue size: ${this.taskQueue.length}`);
  }

  processQueue() {
    console.log("\n--- Processing Task Queue ---");
    // 큐에 쌓인 모든 명령을 순서대로 실행
    this.taskQueue.forEach(command => {
      this.executeCommand(command); // executeCommand를 통해 history에도 기록
    });
    // 큐를 처리한 후 초기화
    this.taskQueue = [];
    console.log("--- Task Queue Processed ---\n");
  }
}

// --- 실행 시나리오 ---
const manager = new CommandManager();
const calculator = new Calculator();

console.log("####### Undo 기능 시연 #######");
// 10을 더하는 명령 객체 생성
const command1 = new CalculatorCommand(calculator, '+', 10);
manager.executeCommand(command1); // Current Value: 10

// 5를 곱하는 명령 객체 생성
const command2 = new CalculatorCommand(calculator, '*', 5);
manager.executeCommand(command2); // Current Value: 50

// 마지막 명령(5 곱하기)을 취소
manager.undo(); // Current Value: 10 (내부적으로 50 / 5 수행)

// 그 이전 명령(10 더하기)을 취소
manager.undo(); // Current Value: 0 (내부적으로 10 - 10 수행)

// 더 이상 취소할 내역이 없는지 확인
manager.undo(); // Undo history is empty.


console.log("\n\n####### 작업 큐(Task Queue) 기능 시연 #######");

const task1 = new CalculatorCommand(calculator, '+', 100);
const task2 = new CalculatorCommand(calculator, '*', 2);
const task3 = new CalculatorCommand(calculator, '-', 50);

// 작업들을 큐에 순서대로 추가 (이때는 실행되지 않음)
manager.addToQueue(task1);
manager.addToQueue(task2);
manager.addToQueue(task3);

// 현재 값은 아직 변하지 않음
console.log(`Before processing queue, value is: ${calculator.currentValue}`); // 0

// 큐에 쌓인 작업들을 한번에 처리
manager.processQueue();
// Current Value: 100  ((0 + 100)
// Current Value: 200  (100 * 2)
// Current Value: 150  (200 - 50)

console.log("\n--- 작업 큐 처리 후 Undo 시도 ---");
// 작업 큐 처리 후에도 history에 기록이 남았으므로 undo 가능
manager.undo(); // Current Value: 200 (내부적으로 150 + 50 수행)
