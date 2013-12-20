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
    } else if(c < 240){
      code = (c << 16) | (bytes[i+1] << 8) | bytes[i+2];
      str += String.fromCharCode(code);
      i += 3;
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
  var type = typeof(value);
  if (type == 'string'){
    this.pack_string(value);
  } else if (type == 'number'){
    if (~~value === value){
      this.pack_integer(value);
    } else{
      this.pack_double(value);
    }
  } else if (type == 'boolean'){
    if (value === true){
      this.bufferBuilder.append(0xc3);
    } else if (value === false){
      this.bufferBuilder.append(0xc2);
    }
  } else if (type == 'undefined'){
    this.bufferBuilder.append(0xc1);
  } else if (type == 'object'){
    if (value === null){
      this.bufferBuilder.append(0xc0);
    } else {
      var constructor = value.constructor;
      if (constructor == Array){
        this.pack_array(value);
      } else if (constructor == Blob || constructor == File) {
        this.pack_bin(value);
      } else if (constructor == ArrayBuffer) {
        if(binaryFeatures.useArrayBufferView) {
          this.pack_bin(new Uint8Array(value));
        } else {
          this.pack_bin(value);
        }
      } else if ('BYTES_PER_ELEMENT' in value){
        if(binaryFeatures.useArrayBufferView) {
          this.pack_bin(new Uint8Array(value.buffer));
        } else {
          this.pack_bin(value.buffer);
        }
      } else if (constructor == Object){
        this.pack_object(value);
      } else if (constructor == Date){
        this.pack_string(value.toString());
      } else if (typeof value.toBinaryPack == 'function'){
        this.bufferBuilder.append(value.toBinaryPack());
      } else {
        throw new Error('Type "' + constructor.toString() + '" not yet supported');
      }
    }
  } else {
    throw new Error('Type "' + type + '" not yet supported');
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
  if ( -0x20 <= num && num <= 0x7f){
    this.bufferBuilder.append(num & 0xff);
  } else if (0x00 <= num && num <= 0xff){
    this.bufferBuilder.append(0xcc);
    this.pack_uint8(num);
  } else if (-0x80 <= num && num <= 0x7f){
    this.bufferBuilder.append(0xd0);
    this.pack_int8(num);
  } else if ( 0x0000 <= num && num <= 0xffff){
    this.bufferBuilder.append(0xcd);
    this.pack_uint16(num);
  } else if (-0x8000 <= num && num <= 0x7fff){
    this.bufferBuilder.append(0xd1);
    this.pack_int16(num);
  } else if ( 0x00000000 <= num && num <= 0xffffffff){
    this.bufferBuilder.append(0xce);
    this.pack_uint32(num);
  } else if (-0x80000000 <= num && num <= 0x7fffffff){
    this.bufferBuilder.append(0xd2);
    this.pack_int32(num);
  } else if (-0x8000000000000000 <= num && num <= 0x7FFFFFFFFFFFFFFF){
    this.bufferBuilder.append(0xd3);
    this.pack_int64(num);
  } else if (0x0000000000000000 <= num && num <= 0xFFFFFFFFFFFFFFFF){
    this.bufferBuilder.append(0xcf);
    this.pack_uint64(num);
  } else{
    throw new Error('Invalid integer');
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
  this.bufferBuilder.append(uInt8ToBytes(num).buffer);
}

Packer.prototype.pack_uint16 = function(num){
  this.bufferBuilder.append(uInt16ToBytes(num).buffer);
}

Packer.prototype.pack_uint32 = function(num){
  this.bufferBuilder.append(uInt32ToBytes(num).buffer);
}

Packer.prototype.pack_int8 = function(num){
  this.bufferBuilder.append(int8ToBytes(num).buffer);
}

Packer.prototype.pack_int16 = function(num){
  this.bufferBuilder.append(int16ToBytes(num).buffer);
}

Packer.prototype.pack_int32 = function(num){
  this.bufferBuilder.append(int32ToBytes(num).buffer);
}

Packer.prototype.pack_float32 = function(num){
  this.bufferBuilder.append(float32ToBytes(num).buffer);
}

Packer.prototype.pack_float64 = function(num){
  this.bufferBuilder.append(float64ToBytes(num).buffer);
}

// Auxiliar functions

// Float64

function bytesToFloat64(bytes){
  return (new Float64Array(bytes.buffer))[0];
}

var _float64Interpreter = new Float64Array(1);
function float64ToBytes(num){
  _float64Interpreter[0] = num;
  return (new Uint8Array(_float64Interpreter.buffer));
}

function toFloat64(num){
  _float64Interpreter[0] = num;
  return _float64Interpreter[0];
}

// Float32

function bytesToFloat32(bytes){
  return (new Float32Array(bytes.buffer))[0];
}

var _float32Interpreter = new Float32Array(1);
function float32ToBytes(num){
  _float32Interpreter[0] = num;
  return (new Uint8Array(_float32Interpreter.buffer));
}

function toFloat32(num){
  _float32Interpreter[0] = num;
  return _float32Interpreter[0];
}

// Int32

function bytesToInt32(bytes){
  return (new Int32Array(bytes.buffer))[0];
}

var _int32Interpreter = new Int32Array(1);
function int32ToBytes(num){
  _int32Interpreter[0] = num;
  return (new Uint8Array(_int32Interpreter.buffer));
}

function toInt32(num){
  _int32Interpreter[0] = num;
  return _int32Interpreter[0];
}

// Unsigned Int32

function bytesToUInt32(bytes){
  return (new Uint32Array(bytes.buffer))[0];
}

var _uInt32Interpreter = new Uint32Array(1);
function uInt32ToBytes(num){
  _uInt32Interpreter[0] = num;
  return (new Uint8Array(_uInt32Interpreter.buffer));
}

function toUInt32(num){
  _uInt32Interpreter[0] = num;
  return _uInt32Interpreter[0];
}

// Int16

function bytesToInt16(bytes){
  return (new Int16Array(bytes.buffer))[0];
}

var _int16Interpreter = new Int16Array(1);
function int16ToBytes(num){
  _int16Interpreter[0] = num;
  return (new Uint8Array(_int16Interpreter.buffer));
}

function toInt16(num){
  _int16Interpreter[0] = num;
  return _int16Interpreter[0];
}

// Unsigned Int16

function bytesToUInt16(bytes){
  return (new Uint16Array(bytes.buffer))[0];
}

var _uInt16Interpreter = new Uint16Array(1);
function uInt16ToBytes(num){
  _uInt16Interpreter[0] = num;
  return (new Uint8Array(_uInt16Interpreter.buffer));
}

function toUInt16(num){
  _uInt16Interpreter[0] = num;
  return _uInt16Interpreter[0];
}

// Int8

function bytesToInt8(bytes){
  return (new Int8Array(bytes.buffer))[0];
}

var _int8Interpreter = new Int8Array(1);
function int8ToBytes(num){
  _int8Interpreter[0] = num;
  return (new Uint8Array(_int8Interpreter.buffer));
}

function toInt8(num){
  _int8Interpreter[0] = num;
  return _int8Interpreter[0];
}

// Unsigned Int8

function bytesToUInt8(bytes){
  return bytes[0];
}

var _uInt8Interpreter = new Uint8Array(1);
function uInt8ToBytes(num){
  _uInt8Interpreter[0] = num;
  return (new Uint8Array(_uInt8Interpreter.buffer));
}

function toUInt8(num){
  _uInt8Interpreter[0] = num;
  return _uInt8Interpreter[0];
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
