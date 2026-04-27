// Receiver: 실제 작업을 수행하는 객체들
const fileSystem = {
    save: () => console.log('파일을 저장합니다.'),
    delete: () => console.log('파일을 삭제합니다.')
  };
  
  // Command: 요청을 캡슐화하는 객체들
  class SaveCommand {
    execute() {
      fileSystem.save();
    }
  }
  class DeleteCommand {
    execute() {
      fileSystem.delete();
    }
  }
  
  // Invoker: 요청을 실행하는 객체
  class Button {
    constructor(label) {
      this.label = label;
    }
  
    setCommand(command) {
      this.command = command;
    }
  
    click() {
      this.command.execute();
    }
  }
  
  const saveButton = new Button('저장');
  saveButton.setCommand(new SaveCommand());
  saveButton.click(); // 출력: 파일을 저장합니다.
  
  const deleteButton = new Button('삭제');
  deleteButton.setCommand(new DeleteCommand());
  deleteButton.click(); // 출력: 파일을 삭제합니다.
  