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

function Unpacker (data){
  // Data is ArrayBuffer
  this.index = 0;
  this.dataBuffer = data;
  this.dataView = new Uint8Array(this.dataBuffer);
  this.length = this.dataBuffer.byteLength;
}


Unpacker.prototype.unpack = function(){
  var type = this.unpack_uint8();
  if (type < 0x80){
    var positive_fixnum = type;
    return positive_fixnum;
  } else if ((type ^ 0xe0) < 0x20){
    var negative_fixnum = (type ^ 0xe0) - 0x20;
    return negative_fixnum;
  }
  var size;
  if ((size = type ^ 0xa0) <= 0x0f){
    return this.unpack_raw(size);
  } else if ((size = type ^ 0xb0) <= 0x0f){
    return this.unpack_string(size);
  } else if ((size = type ^ 0x90) <= 0x0f){
    return this.unpack_array(size);
  } else if ((size = type ^ 0x80) <= 0x0f){
    return this.unpack_map(size);
  }
  switch(type){
    case 0xc0:
      return null;
    case 0xc1:
      return undefined;
    case 0xc2:
      return false;
    case 0xc3:
      return true;
    case 0xca:
      return this.unpack_float32();
    case 0xcb:
      return this.unpack_float64();
    case 0xcc:
      return this.unpack_uint8();
    case 0xcd:
      return this.unpack_uint16();
    case 0xce:
      return this.unpack_uint32();
    case 0xcf:
      return undefined;
    case 0xd0:
      return this.unpack_int8();
    case 0xd1:
      return this.unpack_int16();
    case 0xd2:
      return this.unpack_int32();
    case 0xd3:
      return undefined;
    case 0xd4:
      return undefined;
    case 0xd5:
      return undefined;
    case 0xd6:
      return undefined;
    case 0xd7:
      return undefined;
    case 0xd8:
      size = this.unpack_uint16();
      return this.unpack_string(size);
    case 0xd9:
      size = this.unpack_uint32();
      return this.unpack_string(size);
    case 0xda:
      size = this.unpack_uint16();
      return this.unpack_raw(size);
    case 0xdb:
      size = this.unpack_uint32();
      return this.unpack_raw(size);
    case 0xdc:
      size = this.unpack_uint16();
      return this.unpack_array(size);
    case 0xdd:
      size = this.unpack_uint32();
      return this.unpack_array(size);
    case 0xde:
      size = this.unpack_uint16();
      return this.unpack_map(size);
    case 0xdf:
      size = this.unpack_uint32();
      return this.unpack_map(size);
  }
};

// Number unpack

Unpacker.prototype.unpack_uint8 = function(){
  var bytes = this.read(1);
  this.index++;
  return bytesToUInt8(bytes);
};

Unpacker.prototype.unpack_uint16 = function(){
  var bytes = this.read(2);
  this.index += 2;
  return bytesToUInt16(bytes);
};

Unpacker.prototype.unpack_uint32 = function(){
  var bytes = this.read(4);
  this.index += 4;
  return bytesToUInt32(bytes);
};

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

Unpacker.prototype.unpack_raw = function(size){
  if ( this.length < this.index + size){
    throw new Error('BinaryPackFailure: index is out of range'
      + ' ' + this.index + ' ' + size + ' ' + this.length);
  }
  var buf = this.dataBuffer.slice(this.index, this.index + size);
  this.index += size;

    //buf = util.bufferToString(buf);

  return buf;
}

Unpacker.prototype.unpack_string = function(size){
  var bytes = this.read(size);
  var i = 0, str = '', c, code;
  while(i < size){
    c = bytes[i];
    if ( c < 128){
      str += String.fromCharCode(c);
      i++;
    } else if (c < 224){
      code = (c << 8) | bytes[i+1];
      str += String.fromCharCode(code);
      i += 2;
    } else if(c < 240){
      code = (c << 16) | (bytes[i+1] << 8) | bytes[i+2];
      str += String.fromCharCode(code);
      i += 3;
    } else if(c < 248){
      code = (c << 24) | (bytes[i+1] << 16) | (bytes[i+1] << 8) | bytes[i+3];
      str += String.fromCharCode(code);
      i += 4;
    } else if(c < 252){
      code = (c * Math.pow(2,32)) + ((bytes[i+1] << 24) | (bytes[i+2] << 16) | (bytes[i+3] << 8) | bytes[i+4]);
      str += String.fromCharCode(code);
      i += 5;
    } else {
      code = (bytes[i+1] * Math.pow(2,32) + c * Math.pow(2,40)) + 
             ((bytes[i+2] << 24) | (bytes[i+3] << 16) | (bytes[i+4] << 8) | bytes[i+5]);
      str += String.fromCharCode(code);
      i += 6;
    }
  }
  this.index += size;
  return str;
}

Unpacker.prototype.unpack_array = function(size){
  var objects = new Array(size);
  for(var i = 0; i < size ; i++){
    objects[i] = this.unpack();
  }
  return objects;
}

Unpacker.prototype.unpack_map = function(size){
  var map = {};
  for(var i = 0; i < size ; i++){
    var key  = this.unpack();
    var value = this.unpack();
    map[key] = value;
  }
  return map;
}

Unpacker.prototype.read = function(length){
  var j = this.index;
  if (j + length <= this.length) {
    return this.dataView.subarray(j, j + length);
  } else {
    throw new Error('BinaryPackFailure: read index out of range');
  }
}

function Packer(){
  this.bufferBuilder = new BufferBuilder();
}

Packer.prototype.getBuffer = function(){
  return this.bufferBuilder.getBuffer();
}

Packer.prototype.pack = function(value){
  
  switch(typeof value){
    case 'string':
      this.pack_string(value);
      break;
    case 'number':
      if(toUint32(value) === value || toInt32(value) === value) this.pack_integer(value);
      else this.pack_double(value);
      break;
    case 'boolean':
      if(value) this.bufferBuilder.append(0xc3);
      else this.bufferBuilder.append(0xc2);
      break;
    case 'undefined':
      this.bufferBuilder.append(0xc1);
      break;
    case 'object':
      if(value === null) this.bufferBuilder.append(0xc0);
      else{
        if(value instanceof Array) this.pack_array(value);
        else if(value instanceof Blob || value instanceof File) this.pack_bin(value);
        else if(value instanceof ArrayBuffer) this.pack_bin(value);
        else if('BYTES_PER_ELEMENT' in value) this.pack_bin(value.buffer);
        else if(value instanceof Date) this.pack_string(value.toString());
        else if(typeof value.toBinaryPack == 'function') this.bufferBuilder.append(value.toBinaryPack());
        else this.pack_object(value);
      }
      break;
    default:
      throw new Error('Type "' + type + '" not yet supported');
      break;
  }
  
  this.bufferBuilder.flush();
}


Packer.prototype.pack_bin = function(blob){
  var length = blob.length || blob.byteLength || blob.size;
  if (length <= 0x0f){
    this.pack_uint8(0xa0 + length);
  } else if (length <= 0xffff){
    this.bufferBuilder.append(0xda) ;
    this.pack_uint16(length);
  } else if (length <= 0xffffffff){
    this.bufferBuilder.append(0xdb);
    this.pack_uint32(length);
  } else{
    throw new Error('Invalid length');
    return;
  }
  this.bufferBuilder.append(blob);
}

Packer.prototype.pack_string = function(str){
  var length = utf8Length(str);

  if (length <= 0x0f){
    this.pack_uint8(0xb0 + length);
  } else if (length <= 0xffff){
    this.bufferBuilder.append(0xd8) ;
    this.pack_uint16(length);
  } else if (length <= 0xffffffff){
    this.bufferBuilder.append(0xd9);
    this.pack_uint32(length);
  } else{
    throw new Error('Invalid length');
    return;
  }
  this.bufferBuilder.append(str);
}

Packer.prototype.pack_array = function(ary){
  var length = ary.length;
  if (length <= 0x0f){
    this.pack_uint8(0x90 + length);
  } else if (length <= 0xffff){
    this.bufferBuilder.append(0xdc)
    this.pack_uint16(length);
  } else if (length <= 0xffffffff){
    this.bufferBuilder.append(0xdd);
    this.pack_uint32(length);
  } else{
    throw new Error('Invalid length');
  }
  for(var i = 0; i < length ; i++){
    this.pack(ary[i]);
  }
}

Packer.prototype.pack_integer = function(num){
  if(-0x20 <= num && num <= 0x7f) this.bufferBuilder.append(int8ToBuffer(num));
  else if(num >= 0){
    if(toUint8(num) == num){
      this.bufferBuilder.append(0xcc);
      this.bufferBuilder.append(Uint8ToBuffer(num));
    }else if(toUint16(num) == num){
      this.bufferBuilder.append(0xcd);
      this.bufferBuilder.append(Uint16ToBuffer(num));
    }else if(toUint32(num) == num){
      this.bufferBuilder.append(0xce);
      this.bufferBuilder.append(Uint32ToBuffer(num));
    }
  }else{
    if(toInt8(num) == num){
      this.bufferBuilder.append(0xd0);
      this.bufferBuilder.append(int8ToBuffer(num));
    }else if(toInt16(num) == num){
      this.bufferBuilder.append(0xd1);
      this.bufferBuilder.append(int16ToBuffer(num));
    }else if(toInt32(num) == num){
      this.bufferBuilder.append(0xd2);
      this.bufferBuilder.append(int32ToBuffer(num));
    }
  }
}

Packer.prototype.pack_double = function(num){
  if(toFloat32(num) == num){
    this.bufferBuilder.append(0xca);
    this.pack_float32(num);
  }else{
    this.bufferBuilder.append(0xcb);
    this.pack_float64(num);
  }
}

Packer.prototype.pack_object = function(obj){
  var keys = Object.keys(obj);
  var length = keys.length;
  if (length <= 0x0f){
    this.pack_uint8(0x80 + length);
  } else if (length <= 0xffff){
    this.bufferBuilder.append(0xde);
    this.pack_uint16(length);
  } else if (length <= 0xffffffff){
    this.bufferBuilder.append(0xdf);
    this.pack_uint32(length); 
  } else{
    throw new Error('Invalid length');
  }
  for(var prop in obj){
    if (obj.hasOwnProperty(prop)){
      this.pack(prop);
      this.pack(obj[prop]);
    }
  }
}

Packer.prototype.pack_uint8 = function(num){
  this.bufferBuilder.append(uInt8ToBuffer(num));
}

Packer.prototype.pack_uint16 = function(num){
  this.bufferBuilder.append(uInt16ToBuffer(num));
}

Packer.prototype.pack_uint32 = function(num){
  this.bufferBuilder.append(uInt32ToBuffer(num));
}

Packer.prototype.pack_int8 = function(num){
  this.bufferBuilder.append(int8ToBuffer(num));
}

Packer.prototype.pack_int16 = function(num){
  this.bufferBuilder.append(int16ToBuffer(num));
}

Packer.prototype.pack_int32 = function(num){
  this.bufferBuilder.append(int32ToBuffer(num));
}

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
  return _float32Interpreter[0];
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

// Strings

function _utf8Replace(m){
  var code = m.charCodeAt(0);

  if(code <= 0x7ff) return '00';
  if(code <= 0xffff) return '000';
  if(code <= 0x1fffff) return '0000';
  if(code <= 0x3ffffff) return '00000';
  return '000000';
}

function utf8Length(str){
  if (str.length > 600) {
    // Blob method faster for large strings
    return (new Blob([str])).size;
  } else {
    return str.replace(/[^\u0000-\u007F]/g, _utf8Replace).length;
  }
}
