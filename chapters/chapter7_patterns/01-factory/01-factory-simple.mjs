/*
    new 키워드가 object type을 바인딩함. 
    Imgae object 타입으로. 
    BUT factory 적용 시 more flexibility 가짐
*/

function createImage(name){
    return new Image(name)
}


class Image {
    constructor(path){
        this.path = path ; 
    }
}

const image = createImage("image.jpg")

console.log(image)