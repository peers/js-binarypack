exports.BinaryPack = {
  unpack: function(data){
    var unpacker = new Unpacker(data);
    return unpacker.unpack();
  },
  pack: function(data){
    var packer = new Packer();
    packer.pack(data);
    var buffer = packer.getBuffer();
    return buffer;
  }
};

var FileConstructor = (function(){
  try{
    new File(['foo'],'bar');
  }catch(e){
    return false;
  }
  
  return true;
})();

//----------//
// UNPACKER //
//----------//

function Unpacker (data){
  // Data is ArrayBuffer
  this.index = 0;
  this.dataBuffer = data;
  this.dataView = new Uint8Array(this.dataBuffer);
  this.length = this.dataBuffer.byteLength;
}


Unpacker.prototype.unpack = function(back){
  var type = this.unpack_uint8();
  
  switch(type){
    
    // null / undefined
    case 0x00:
      return null;
    case 0x01:
      return undefined;
      
    // Boolean
    case 0x02:
      return false;
    case 0x03:
      return true;
    
    // Float
    case 0x04:
      return this.unpack_float32();
    case 0x05:
      return this.unpack_float64();
      
    // Unsigned int
    case 0x06:
      return this.unpack_uint8();
    case 0x07:
      return this.unpack_uint16();
    case 0x08:
      return this.unpack_uint32();
      
    // Int
    case 0x09:
      return this.unpack_int8();
    case 0x0a:
      return this.unpack_int16();
    case 0x0b:
      return this.unpack_int32();
      
    // String
    case 0x0c:
      return this.unpack_string();
      
    // Date
    case 0x0d:
      return this.unpack_date();
    
    // File
    case 0x0e:
      return this.unpack_file();
    
    // Blob
    case 0x0f:
      return this.unpack_blob();
    
    // ArrayBuffer
    case 0x10:
      return this.unpack_raw(this.unpack());
    
    // ArrayBufferView
    case 0x11:
      return this.unpack_uint8array();
    case 0x12:
      return this.unpack_uint16array();
    case 0x13:
      return this.unpack_uint32array();
    case 0x14:
      return this.unpack_int8array();
    case 0x15:
      return this.unpack_int16array();
    case 0x16:
      return this.unpack_int32array();
    case 0x17:
      return this.unpack_float32array();
    case 0x18:
      return this.unpack_float64array();
    
    // DataView
    case 0x19:
      return this.unpack_dataview();
    
    // Back reference
    case 0x1a:
      return back[this.unpack()];
    
    // Array
    case 0x1b:
      return this.unpack_array(back);
    
    // Object
    case 0x1c:
      return this.unpack_map(back);
    
  }
};

// Number unpack

// Unsigned int

Unpacker.prototype.unpack_uint8 = function(){
  var bytes = this.read(1);
  this.index++;
  return bytesToUint8(bytes);
};

Unpacker.prototype.unpack_uint16 = function(){
  var bytes = this.read(2);
  this.index += 2;
  return bytesToUint16(bytes);
};

Unpacker.prototype.unpack_uint32 = function(){
  var bytes = this.read(4);
  this.index += 4;
  return bytesToUint32(bytes);
};

// Int

Unpacker.prototype.unpack_int8 = function(){
  var bytes = this.read(1);
  this.index++;
  return bytesToInt8(bytes);
};

Unpacker.prototype.unpack_int16 = function(){
  var bytes = this.read(2);
  this.index += 2;
  return bytesToInt16(bytes);
}

Unpacker.prototype.unpack_int32 = function(){
  var bytes = this.read(4);
  this.index += 4;
  return bytesToInt32(bytes);
}

// Float

Unpacker.prototype.unpack_float32 = function(){
  var bytes = this.read(4);
  this.index += 4;
  return bytesToFloat32(bytes);
}

Unpacker.prototype.unpack_float64 = function(){
  var bytes = this.read(8);
  this.index += 8;
  return bytesToFloat64(bytes);
}

// Date

Unpacker.prototype.unpack_date = function(){
  var value = this.unpack_float64();
  return new Date(value);
}

// Binary

// File

Unpacker.prototype.unpack_file = function(){
  var type = this.unpack_string(),
      name = this.unpack_string(),
      date = this.unpack_float64(),
      size = this.unpack(),
      buffer = this.unpack_raw(size);
  
  if(FileConstructor) return new File([buffer],name,{type: type,lastModified: date});
  
  var blob = new Blob([buffer],{type: type});
  blob.name = name;
  blob.lastModifiedDate = new Date(date);
  
  return blob;
}

// Blob

Unpacker.prototype.unpack_blob = function(){
  var type = this.unpack_string(),
      size = this.unpack(),
      buffer = this.unpack_raw(size);
      
  return new Blob([buffer],{type: type});
}

// Array buffer

Unpacker.prototype.unpack_raw = function(size){
  if ( this.length < this.index + size){
    throw new Error('BinaryPackFailure: index is out of range'
      + ' ' + this.index + ' ' + size + ' ' + this.length);
  }
  var buf = this.dataBuffer.slice(this.index, this.index + size);
  this.index += size;

  return buf;
}

// ArrayBufferView

Packer.prototype.unpack_uint8array = function(){
  var byteLength = this.unpack(),
      byteOffset = this.unpack(),
      buffer = this.unpack_raw(this.unpack());
  
  return new Uint8Array(buffer,byteOffset,byteLength);
}

Packer.prototype.unpack_uint16array = function(){
  var byteLength = this.unpack(),
      byteOffset = this.unpack(),
      buffer = this.unpack_raw(this.unpack());
  
  return new Uint16Array(buffer,byteOffset,byteLength);
}

Packer.prototype.unpack_uint32array = function(){
  var byteLength = this.unpack(),
      byteOffset = this.unpack(),
      buffer = this.unpack_raw(this.unpack());
  
  return new Uint32Array(buffer,byteOffset,byteLength);
}

Packer.prototype.unpack_int8array = function(){
  var byteLength = this.unpack(),
      byteOffset = this.unpack(),
      buffer = this.unpack_raw(this.unpack());
  
  return new Int8Array(buffer,byteOffset,byteLength);
}

Packer.prototype.unpack_int16array = function(){
  var byteLength = this.unpack(),
      byteOffset = this.unpack(),
      buffer = this.unpack_raw(this.unpack());
  
  return new Int16Array(buffer,byteOffset,byteLength);
}

Packer.prototype.unpack_int32array = function(){
  var byteLength = this.unpack(),
      byteOffset = this.unpack(),
      buffer = this.unpack_raw(this.unpack());
  
  return new Int32Array(buffer,byteOffset,byteLength);
}

Packer.prototype.unpack_float32array = function(){
  var byteLength = this.unpack(),
      byteOffset = this.unpack(),
      buffer = this.unpack_raw(this.unpack());
  
  return new Float32Array(buffer,byteOffset,byteLength);
}

Packer.prototype.unpack_float64array = function(){
  var byteLength = this.unpack(),
      byteOffset = this.unpack(),
      buffer = this.unpack_raw(this.unpack());
  
  return new Float64Array(buffer,byteOffset,byteLength);
}

// DataView

Packer.prototype.unpack_dataview = function(){
  var byteLength = this.unpack(),
      byteOffset = this.unpack(),
      buffer = this.unpack_raw(this.unpack());
  
  return new DataView(buffer,byteOffset,byteLength);
}

// String

Unpacker.prototype.unpack_string = function(){
  var i = this.index, str = '',code;
  
  while(this.dataView[i] != 0xff){
    
    if(this.dataView[i] < 128){
      str += String.fromCharCode(this.dataView[i]);
      i++;
      continue;
    }
    
    if(this.dataView[i] < 224){
      code = ((this.dataView[i] & 0x3f) << 6) | (this.dataView[i+1] & 0x7f);
      str += String.fromCharCode(code);
      i += 2;
      continue;
    }
    
    if(this.dataView[i] < 240){
      code = ((this.dataView[i] & 0x1f) << 12) | ((this.dataView[i+1] & 0x7f) << 6) | (this.dataView[i+2] & 0x7f);
      str += String.fromCharCode(code);
      i += 3;
      continue;
    }
    
    if(this.dataView[i] < 248){
      code =  ((this.dataView[i] & 0x0f) << 18) | ((this.dataView[i+1] & 0x7f) << 12) | 
              ((this.dataView[i+1] & 0x7f) << 6) | (this.dataView[i+3] & 0x7f);
      str += String.fromCharCode(code);
      i += 4;
      continue;
    }
    
    if(this.dataView[i] < 252){
      code =  ((this.dataView[i] & 0x07) << 24) | ((this.dataView[i+1] & 0x7f) << 18) | 
              ((this.dataView[i+2] & 0x7f) << 12) | ((this.dataView[i+3] & 0x7f) << 6) | (this.dataView[i+4] & 0x7f);
      str += String.fromCharCode(code);
      i += 5;
      continue;
    }
    
    code = ((this.dataView[i+1] & 0x03) << 30) | ((this.dataView[i] & 0x7f) << 24) | 
           ((this.dataView[i+2] & 0x7f) << 18) | ((this.dataView[i+3] & 0x7f) << 12) |
           ((this.dataView[i+4] & 0x7f) << 6) | (this.dataView[i+5] & 0x7f);
    str += String.fromCharCode(code);
    i += 6; 
    
  }
  
  this.index = i + 1;
  return str;
}

// Array

Unpacker.prototype.unpack_array = function(back){
  var size = this.unpack(),
      array = new Array(size);
  
  if(!back) back = [];
  back.push(array);
  
  for(var i = 0; i < size ; i++){
    array[i] = this.unpack(back);
  }
  
  back.pop();
  
  return array;
}

// Object

Unpacker.prototype.unpack_map = function(back){
  var map = {},
      size = this.unpack();
  
  if(!back) back = [];
  back.push(map);
  
  for(var i = 0; i < size ; i++){
    var key = this.unpack_string();
    var value = this.unpack(back);
    map[key] = value;
  }
  
  back.pop();
  
  return map;
}

// Read function

Unpacker.prototype.read = function(length){
  var j = this.index;
  if (j + length <= this.length) {
    return this.dataView.subarray(j, j + length);
  } else {
    throw new Error('BinaryPackFailure: read index out of range');
  }
}

//--------//
// PACKER //
//--------//

function Packer(){
  this.bufferBuilder = new BufferBuilder();
}

Packer.prototype.getBuffer = function(){
  return this.bufferBuilder.getBuffer();
}

Packer.prototype.pack = function(value,back){
  
  switch(typeof value){
    case 'string':
      this.pack_string(value);
      break;
    case 'number':
      if(toUint32(value) === value || toInt32(value) === value) this.pack_integer(value);
      else this.pack_double(value);
      break;
    case 'boolean':
      if(value) this.bufferBuilder.append(Uint8ToBuffer(0x03));
      else this.bufferBuilder.append(Uint8ToBuffer(0x02));
      break;
    case 'undefined':
      this.bufferBuilder.append(Uint8ToBuffer(0x01));
      break;
    case 'object':
      if(value === null) this.bufferBuilder.append(Uint8ToBuffer(0x00));
      else{
        if(typeof value.toBinaryPack == 'function') return this.bufferBuilder.append(value.toBinaryPack());
        if(value.constructor == Object) return this.pack_object(value,back);
        if(value instanceof Array) return this.pack_array(value,back);
        if(value instanceof Date) return this.pack_date(value);
        if(value instanceof Blob){
          if(value instanceof File) return this.pack_file(value);
          return this.pack_blob(value);
        }
        if(value instanceof ArrayBuffer) return this.pack_buffer(value);
        if(value.buffer instanceof ArrayBuffer){
          if(value instanceof Uint8Array) return this.pack_uint8array(value);
          if(value instanceof Uint16Array) return this.pack_uint16array(value);
          if(value instanceof Uint32Array) return this.pack_uint32array(value);
          if(value instanceof Int8Array) return this.pack_int8array(value);
          if(value instanceof Int16Array) return this.pack_int16array(value);
          if(value instanceof Int32Array) return this.pack_int32array(value);
          if(value instanceof Float32Array) return this.pack_float32array(value);
          if(value instanceof Float64Array) return this.pack_float64array(value);
          if(value instanceof DataView) return this.pack_dataview(value);
          return this.pack_object(value,back);
        }
        
        return this.pack_object(value,back);
      }
      break;
  }
}
 
// Date

Packer.prototype.pack_date = function(date){
  this.bufferBuilder.append(Uint8ToBuffer(0x0d));
  this.pack_raw_date(date);
}

Packer.prototype.pack_raw_date = function(date){
  var value = date.valueOf();
  this.pack_float64(value);
}

// Binary

// File

Packer.prototype.pack_file = function(file){
  this.bufferBuilder.append(Uint8ToBuffer(0x0e));
  this.pack_raw_string(file.type);
  this.pack_raw_string(file.name);
  if(file.lastModifiedDate) this.pack_raw_date(file.lastModifiedDate);
  else this.pack_float64(lastModified);
  this.pack(file.size);
  this.bufferBuilder.append(file);
}

// Blob

Packer.prototype.pack_blob = function(blob){
  this.bufferBuilder.append(Uint8ToBuffer(0x0f));
  this.pack_raw_string(blob.type);
  this.pack(blob.size);
  this.bufferBuilder.append(blob);
}

// ArrayBuffer

Packer.prototype.pack_buffer = function(buffer){
  this.bufferBuilder.append(Uint8ToBuffer(0x10));
  this.pack_raw_buffer(buffer);
}

Packer.prototype.pack_raw_buffer = function(buffer){
  this.pack(buffer.length);
  this.bufferBuilder.append(blob);
}

// ArrayBufferView

Packer.prototype.pack_raw_bufferview = function(bufferview){
  this.pack(bufferview.byteLength);
  this.pack(bufferview.byteOffset);
  this.pack_raw_buffer(bufferview.buffer);
}

Packer.prototype.pack_uint8array = function(array){
  this.bufferBuilder.append(Uint8ToBuffer(0x11));
  this.pack_raw_bufferview(array);
}

Packer.prototype.pack_uint16array = function(array){
  this.bufferBuilder.append(Uint8ToBuffer(0x12));
  this.pack_raw_bufferview(array);
}

Packer.prototype.pack_uint32array = function(array){
  this.bufferBuilder.append(Uint8ToBuffer(0x13));
  this.pack_raw_bufferview(array);
}

Packer.prototype.pack_int8array = function(array){
  this.bufferBuilder.append(Uint8ToBuffer(0x14));
  this.pack_raw_bufferview(array);
}

Packer.prototype.pack_int16array = function(array){
  this.bufferBuilder.append(Uint8ToBuffer(0x15));
  this.pack_raw_bufferview(array);
}

Packer.prototype.pack_int32array = function(array){
  this.bufferBuilder.append(Uint8ToBuffer(0x16));
  this.pack_raw_bufferview(array);
}

Packer.prototype.pack_float32array = function(array){
  this.bufferBuilder.append(Uint8ToBuffer(0x17));
  this.pack_raw_bufferview(array);
}

Packer.prototype.pack_float64array = function(array){
  this.bufferBuilder.append(Uint8ToBuffer(0x18));
  this.pack_raw_bufferview(array);
}

// DataView

Packer.prototype.pack_dataview = function(dataview){
  this.bufferBuilder.append(Uint8ToBuffer(0x19));
  this.pack_raw_bufferview(dataview);
}

// String

Packer.prototype.pack_string = function(str){
  this.bufferBuilder.append(Uint8ToBuffer(0x0c));
  this.pack_raw_string(str);
}

Packer.prototype.pack_raw_string = function(str){
  this.bufferBuilder.append(str);
  this.bufferBuilder.append(Uint8ToBuffer(0xff));
}

// Array

Packer.prototype.pack_array = function(array,back){
  this.bufferBuilder.append(Uint8ToBuffer(0x1b));
  this.pack(array.length);
  
  if(!back) back = [];
  back.push(array);
  
  var j;
  for(var i = 0; i < array.length ; i++){
    
    if((j = back.indexOf(array[i])) != -1){
      this.bufferBuilder.append(Uint8ToBuffer(0x1a));
      this.pack(j);
      continue;
    }
    
    this.pack(array[i],back);
  }
  
  back.pop();
}

// Object

Packer.prototype.pack_object = function(obj,back){
  this.bufferBuilder.append(Uint8ToBuffer(0x1c));
  this.pack(Object.keys(obj).length);
  
  if(!back) back = [];
  back.push(obj);
  
  var j;
  for(var i in obj){
    if(!obj.hasOwnProperty(i)) continue;
    
    this.pack_raw_string(i);
    
    if((j = back.indexOf(obj[i])) != -1){
      this.bufferBuilder.append(Uint8ToBuffer(0x1a));
      this.pack(j);
      continue;
    }
    
    this.pack(obj[i],back);
  }
  
  back.pop();
}


// Int

Packer.prototype.pack_integer = function(num){
  if(num >= 0){
    if(toUint8(num) == num){
      this.bufferBuilder.append(Uint8ToBuffer(0x06));
      this.bufferBuilder.append(Uint8ToBuffer(num));
    }else if(toUint16(num) == num){
      this.bufferBuilder.append(Uint8ToBuffer(0x07));
      this.bufferBuilder.append(Uint16ToBuffer(num));
    }else if(toUint32(num) == num){
      this.bufferBuilder.append(Uint8ToBuffer(0x08));
      this.bufferBuilder.append(Uint32ToBuffer(num));
    }
  }else{
    if(toInt8(num) == num){
      this.bufferBuilder.append(Uint8ToBuffer(0x09));
      this.bufferBuilder.append(int8ToBuffer(num));
    }else if(toInt16(num) == num){
      this.bufferBuilder.append(Uint8ToBuffer(0x0a));
      this.bufferBuilder.append(int16ToBuffer(num));
    }else if(toInt32(num) == num){
      this.bufferBuilder.append(Uint8ToBuffer(0x0b));
      this.bufferBuilder.append(int32ToBuffer(num));
    }
  }
}

// Float

Packer.prototype.pack_double = function(num){
  if(toFloat32(num) == num){
    this.bufferBuilder.append(Uint8ToBuffer(0x04));
    this.pack_float32(num);
  }else{
    this.bufferBuilder.append(Uint8ToBuffer(0x05));
    this.pack_float64(num);
  }
}

// Unsigned int

Packer.prototype.pack_uint8 = function(num){
  this.bufferBuilder.append(uInt8ToBuffer(num));
}

Packer.prototype.pack_uint16 = function(num){
  this.bufferBuilder.append(uInt16ToBuffer(num));
}

Packer.prototype.pack_uint32 = function(num){
  this.bufferBuilder.append(uInt32ToBuffer(num));
}

// Int

Packer.prototype.pack_int8 = function(num){
  this.bufferBuilder.append(int8ToBuffer(num));
}

Packer.prototype.pack_int16 = function(num){
  this.bufferBuilder.append(int16ToBuffer(num));
}

Packer.prototype.pack_int32 = function(num){
  this.bufferBuilder.append(int32ToBuffer(num));
}

// Float

Packer.prototype.pack_float32 = function(num){
  this.bufferBuilder.append(float32ToBuffer(num));
}

Packer.prototype.pack_float64 = function(num){
  this.bufferBuilder.append(float64ToBuffer(num));
}

// Auxiliar functions

// Float64

var _float64Buffer = new Uint8Array(8);
var _float64Interpreter = new Float64Array(_float64Buffer.buffer);

function bytesToFloat64(bytes){
  _float64Buffer.set(bytes);
  return _float64Interpreter[0];
}

function float64ToBuffer(num){
  _float64Interpreter[0] = num;
  return _float64Interpreter.buffer.slice(0);
}

function toFloat64(num){
  _float64Interpreter[0] = num;
  return _float64Interpreter[0];
}

// Float32

var _float32Buffer = new Uint8Array(4);
var _float32Interpreter = new Float32Array(_float32Buffer.buffer);

function bytesToFloat32(bytes){
  _float32Buffer.set(bytes);
  return _float32Interpreter[0];
}

function float32ToBuffer(num){
  _float32Interpreter[0] = num;
  return _float32Interpreter.buffer.slice(0);
}

function toFloat32(num){
  _float32Interpreter[0] = num;
  return _float32Interpreter[0];
}

// Int32

var _int32Buffer = new Uint8Array(4);
var _int32Interpreter = new Int32Array(_int32Buffer.buffer);

function bytesToInt32(bytes){
  _int32Buffer.set(bytes);
  return _int32Interpreter[0];
}

function int32ToBuffer(num){
  _int32Interpreter[0] = num;
  return _int32Interpreter.buffer.slice(0);
}

function toInt32(num){
  _int32Interpreter[0] = num;
  return _int32Interpreter[0];
}

// Unsigned Int32

var _Uint32Buffer = new Uint8Array(4);
var _Uint32Interpreter = new Uint32Array(_Uint32Buffer.buffer);

function bytesToUint32(bytes){
  _Uint32Buffer.set(bytes);
  return _Uint32Interpreter[0];
}

function Uint32ToBuffer(num){
  _Uint32Interpreter[0] = num;
  return _Uint32Interpreter.buffer.slice(0);
}

function toUint32(num){
  _Uint32Interpreter[0] = num;
  return _Uint32Interpreter[0];
}

// Int16

var _int16Buffer = new Uint8Array(2);
var _int16Interpreter = new Int16Array(_int16Buffer.buffer);

function bytesToInt16(bytes){
  _int16Buffer.set(bytes);
  return _int16Interpreter[0];
}

function int16ToBuffer(num){
  _int16Interpreter[0] = num;
  return _int16Interpreter.buffer.slice(0);
}

function toInt16(num){
  _int16Interpreter[0] = num;
  return _int16Interpreter[0];
}

// Unsigned Int16

var _Uint16Buffer = new Uint8Array(2);
var _Uint16Interpreter = new Uint16Array(_Uint16Buffer.buffer);

function bytesToUint16(bytes){
  _Uint16Buffer.set(bytes);
  return _Uint16Interpreter[0];
}

function Uint16ToBuffer(num){
  _Uint16Interpreter[0] = num;
  return _Uint16Interpreter.buffer.slice(0);
}

function toUint16(num){
  _Uint16Interpreter[0] = num;
  return _Uint16Interpreter[0];
}

// Int8

var _int8Buffer = new Uint8Array(1);
var _int8Interpreter = new Int8Array(_int8Buffer.buffer);

function bytesToInt8(bytes){
  _int8Buffer.set(bytes);
  return _int8Interpreter[0];
}

function int8ToBuffer(num){
  _int8Interpreter[0] = num;
  return _int8Interpreter.buffer.slice(0);
}

function toInt8(num){
  _int8Interpreter[0] = num;
  return _int8Interpreter[0];
}

// Unsigned Int8

var _Uint8Buffer = new Uint8Array(1);

function bytesToUint8(bytes){
  _Uint8Buffer.set(bytes);
  return _Uint8Buffer[0];
}

function Uint8ToBuffer(num){
  _Uint8Buffer[0] = num;
  return _Uint8Buffer.buffer.slice(0);
}

function toUint8(num){
  _Uint8Buffer[0] = num;
  return _Uint8Buffer[0];
}
