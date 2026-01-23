export class Image {
    constructor(path) {
      this.path = path
    }
  }

/*
  기존 const image = new Image()는 특정 클래스에 직접적으로 image 객체가 의존하게됨. 매우 강하게 결합되어서 나중에 수정하려면 번거로움
  아래처럼 요청사항이 바뀐다 가정 시...... 
  다른 포맷의데이터로 클래스 객체를 생성해야함 
  new image로 생성한 경우 직접 서비스 단계으 ㅣ코드를 수정할텐데 , 팩토리면 팩토리 내부 로직만 수정하고 서비스 로직은 깔끔하게 가능
*/

export class ImageGif extends Image {
    constructor(path) {
      if (!path.match(gifRgx)) {
        throw new Error(`${path} is not a GIF image`)
      }
      super(path)
    }
  }

  export class ImageJpeg extends Image {
    constructor(path) {
      if (!path.match(jpgRgx)) {
        throw new Error(`${path} is not a JPEG image`)
      }
      super(path)
    }
  }

  export class ImagePng extends Image {
    constructor(path) {
      if (!path.match(pngRgx)) {
        throw new Error(`${path} is not a PNG image`)
      }
      super(path)
    }
  }



  export const jpgRgx = /\.jpe?g$/
  export const gifRgx = /\.gif$/
  export const pngRgx = /\.png$/
  
  function createImage(name) {
    if (name.match(jpgRgx)) {
      return new ImageJpeg(name)
    }
    if (name.match(gifRgx)) {
      return new ImageGif(name)
    }
    if (name.match(pngRgx)) {
      return new ImagePng(name)
    }
    throw new Error('Unsupported format')
  }
  //소비자 코드는깔끔하고 변경할 곳, 분기점이 없다. 
  const image1 = createImage('photo.jpg')
  const image2 = createImage('photo.gif')
  const image3 = createImage('photo.png')
  
  console.log(image1, image2, image3)