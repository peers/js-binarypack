/*! binarypack.js build:0.0.7, development. Copyright(c) 2012 Eric Zhang <eric@ericzhang.com> MIT Licensed */
(function(exports){
var binaryFeatures = {};
binaryFeatures.useBlobBuilder = (function(){
  try {
    new Blob([]);
    return false;
  } catch (e) {
    return true;
  }
})();

binaryFeatures.useArrayBufferView = !binaryFeatures.useBlobBuilder && (function(){
  try {
    return (new Blob([new Uint8Array([])])).size === 0;
  } catch (e) {
    return true;
  }
})();

exports.binaryFeatures = binaryFeatures;
exports.BlobBuilder = window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder || window.BlobBuilder;

function BufferBuilder(){
  this._pieces = [];
  this._parts = [];
}

BufferBuilder.prototype.append = function(data) {
  if(typeof data === 'number') {
    this._pieces.push(data);
  } else {
    this.flush();
    this._parts.push(data);
  }
};

BufferBuilder.prototype.flush = function() {
  if (this._pieces.length > 0) {
    var buf = new Uint8Array(this._pieces);
    if(!binaryFeatures.useArrayBufferView) {
      buf = buf.buffer;
    }
    
    setTimeout(eraseBuffer,0,buf.buffer);
    this._parts.push(buf);
    this._pieces = [];
  }
};

BufferBuilder.prototype.getBuffer = function() {
  this.flush();
  if(binaryFeatures.useBlobBuilder) {
    var builder = new BlobBuilder();
    for(var i = 0, ii = this._parts.length; i < ii; i++) {
      builder.append(this._parts[i]);
    }
    return builder.getBlob();
  } else {
    return new Blob(this._parts);
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

var nothing = {};

//-------//
// CLOCK //
//-------//

var _clockFile = URL.createObjectURL(new Blob([
		'function postIt(time){postMessage(time);}' +
		'self.onmessage = function(e){setTimeout(postIt,e.data,e.data);};'
	],{type: 'text/javascript'}));

function _onTick(e){
	var that = this.that;
	
	var i = that.times.indexOf(e.data);
	that.times.splice(i,1);
	that.callbacks.splice(i,1)[0].apply(that.those.splice(i,1)[0],that.args.splice(i,1)[0]);
}

function Clock(){
	this.worker = new Worker(_clockFile);
	this.worker.onmessage = _onTick;
	this.worker.that = this;
	
	this.callbacks = [];
	this.those = [];
	this.args = [];
	this.times = [];
}

Clock.prototype.after = function(time,callback,that,args){
	this.times.push(time);
	this.callbacks.push(callback);
	this.those.push(that);
	this.args.push(args);
	this.worker.postMessage(time);
}

Clock.prototype.destroy = function(){
	this.worker.terminate();
	this.callbacks = [];
	this.those = [];
	this.args = [];
	this.times = [];
}

var masterClock = new Clock();

//----------//
// UNPACKER //
//----------//

function Unpacker(data){
	this.index = 0;
	
	this.callbacks = [];
	
	if(data instanceof ArrayBuffer){
		this.view = new Uint8Array(data);
		this.start = 0;
		this.end = data.byteLength;
	}else{
		this.blob = data;
		
		this.start = 0;
		this.end = 0;
		this.view = undefined;
		
		this._read = {
			n: undefined,
			cb: undefined,
			type: undefined
		};
		
		this.reader = new FileReader();
		this.reader.onload = _onReaderLoad;
		this.reader.obj = this;
	}
	
	this.backReferences = [];
	
	this.stringBuffer = '';
	this.codeBuffer = 0;
	
	this.sizeBuffer = [];
	this.keyBuffer = [];
	this.genericBuffer = undefined;
}

Unpacker.prototype.refresh = function(){
	eraseBuffer(this.view.buffer);
	this.view = undefined;
};

Unpacker.prototype.doRecursively = function(callback,arg){
	try{
		callback.call(this,arg);
	}catch(e){
		callback.call(this,arg);
	}
}

Unpacker.prototype.read = function(n,callback,type){
	var from = this.index,to = this.index + n;
	
	if(this.blob && type == 'blob'){
		this.index = to;
		
		if(this.index == this.end){
			eraseBuffer(this.view.buffer);
			this.view = undefined;
		}
		
		this.doRecursively(callback,this.blob.slice(from,to));
		return;
	}
	
	if(this.view){
		if(this.end < to){
			eraseBuffer(this.view.buffer);
			var subBlob = this.blob.slice(from,Math.max(from + BinaryPack.maxRAM,to));
			
			this.end = from + subBlob.size;
			this.start = from;
			
			this._read.cb = callback;
			this._read.n = n;
			this._read.type = type;
			
			this.reader.readAsArrayBuffer(subBlob);
		}else{
			this.index = to;
			
			switch(type){
				case 'arraybuffer':
					var arg = this.view.buffer.slice(from - this.start,to - this.start);
					this.doRecursively(callback,arg);
					break;
				case 'blob':
					var arg = this.view.buffer.slice(from - this.start,to - this.start);
					_blober(arg,callback,this);
					break;
				default:
					var arg = [],roof = to - this.start;
					for(var i = from - this.start;i < roof;i++){
						arg.push(this.view[i]);
					}
					
					this.doRecursively(callback,arg);
					break;
			}
			
		}
	}else{
		var subBlob = this.blob.slice(from,Math.max(from + BinaryPack.maxRAM,to));
		
		this.end = from + subBlob.size;
		this.start = from;
		
		this._read.cb = callback;
		this._read.n = n;
		this._read.type = type;
		
		this.reader.readAsArrayBuffer(subBlob);
	}
	
}

function _onReaderLoad(){
	this.obj.view = new Uint8Array(this.result);
	this.obj.read(this.obj._read.n,this.obj._read.cb,this.obj._read.type);
}

// Float

function _float32unpack(bytes){
	this.callbacks.pop().call(this,bytesToFloat32(bytes));
}

function _float64unpack(bytes){
	this.callbacks.pop().call(this,bytesToFloat64(bytes));
}

// Unsigned int

function _uint8unpack(bytes){
	this.callbacks.pop().call(this,bytesToUint8(bytes));
}

function _uint16unpack(bytes){
	this.callbacks.pop().call(this,bytesToUint16(bytes));
}

function _uint32unpack(bytes){
	this.callbacks.pop().call(this,bytesToUint32(bytes));
}

// Int

function _int8unpack(bytes){
	this.callbacks.pop().call(this,bytesToInt8(bytes));
}

function _int16unpack(bytes){
	this.callbacks.pop().call(this,bytesToInt16(bytes));
}

function _int32unpack(bytes){
	this.callbacks.pop().call(this,bytesToInt32(bytes));
}

// String

function _startStringUnpack(byte){
	byte = byte[0];
	
	if(byte == 0xff){
		var string = this.stringBuffer;
		this.stringBuffer = '';
		this.codeBuffer = 0;
		return this.callbacks.pop().call(this,string);
	}
	
	if(byte < 128){
		this.codeBuffer = 0;
		this.stringBuffer += String.fromCharCode(byte);
		return this.read(1,_startStringUnpack);
	}
	
	if(byte < 224){
		this.codeBuffer = (byte & 0x3f) << 6;
		return this.read(1,_continueStringUnpack);
	}
	
	if(byte < 240){
		this.codeBuffer = (byte & 0x1f) << 12;
		return this.read(2,_continueStringUnpack);
	}
	
	if(byte < 248){
		this.codeBuffer = (byte & 0x0f) << 18;
		return this.read(3,_continueStringUnpack);
	}
	
	if(byte < 252){
		this.codeBuffer = (byte & 0x07) << 18;
		return this.read(4,_continueStringUnpack);
	}
	
	this.codeBuffer = (byte & 0x03) << 30;
	this.read(5,_continueStringUnpack);
}

function _continueStringUnpack(bytes){
	for(var i = 0;i < bytes.length;i++){
		this.codeBuffer |= (bytes[i] & 0x7f) << ((bytes.length - 1 - i) * 6);
	}
	
	this.stringBuffer += String.fromCharCode(this.codeBuffer);
	this.codeBuffer = 0;
	this.read(1,_startStringUnpack);
}

// Date

function _dateUnpack(bytes){
	this.callbacks.pop().call(this,new Date(bytesToFloat64(bytes)));
}

// Binary

// File

function _getFileType(type){
	this.genericBuffer = {type: type};
	this.callbacks.push(_getFileName);
	this.read(1,_startStringUnpack);
}

function _getFileName(name){
	this.genericBuffer.name = name;
	this.callbacks.push(_getFileDate);
	this.read(8,_float64unpack);
}

function _getFileDate(date){
	this.genericBuffer.date = date;
	this.unpack(_getFileSize);
}

function _getFileSize(size){
	this.read(size,_getFile,'blob');
}

function _getFile(blob){
	var name = this.genericBuffer.name,
			date = this.genericBuffer.date,
			type = this.genericBuffer.type;
	
	this.genericBuffer = undefined;
	if(FileConstructor) this.callbacks.pop().call(this,new File([blob],name,{type: type,lastModified: date}));
	else{
		blob = new Blob([blob],{type: type});
		blob.name = name;
		blob.lastModifiedDate = new Date(date);
		blob.lastModified = date;
		this.callbacks.pop().call(this,blob);
	}
}

// Blob

function _getBlobType(type){
	this.genericBuffer = type;
	this.unpack(_getBlobSize);
}

function _getBlobSize(size){
	this.read(size,_getBlob,'blob');
}

function _getBlob(blob){
	var type = this.genericBuffer;
	this.genericBuffer = undefined;
	blob = new Blob([blob],{type: type});
	this.callbacks.pop().call(this,blob);
}

// ArrayBuffer

function _getArrayBufferSize(size){
	this.read(size,_getArrayBuffer,'arraybuffer');
}

function _getArrayBuffer(buffer){
	this.callbacks.pop().call(this,buffer);
}

// ArrayBufferView

function _getArrayBufferLength(length){
	this.genericBuffer = {length: length};
	this.unpack(_getArrayBufferOffset);
}

function _getArrayBufferOffset(offset){
	this.genericBuffer.offset = offset;
	this.unpack(_getArrayBufferSize);
}

// Uint8

function _getUint8ArrayBuffer(buffer){
	var byteOffset = this.genericBuffer.offset,
			byteLength = this.genericBuffer.length;
	
	this.callbacks.pop().call(this,new Uint8Array(buffer,byteOffset,byteLength));
}

// Uint16

function _getUint16ArrayBuffer(buffer){
	var byteOffset = this.genericBuffer.offset,
			byteLength = this.genericBuffer.length;
	
	this.callbacks.pop().call(this,new Uint16Array(buffer,byteOffset,byteLength/2));
}

// Uint32

function _getUint32ArrayBuffer(buffer){
	var byteOffset = this.genericBuffer.offset,
			byteLength = this.genericBuffer.length;
	
	this.callbacks.pop().call(this,new Uint32Array(buffer,byteOffset,byteLength/4));
}

// Int8

function _getInt8ArrayBuffer(buffer){
	var byteOffset = this.genericBuffer.offset,
			byteLength = this.genericBuffer.length;
	
	this.callbacks.pop().call(this,new Int8Array(buffer,byteOffset,byteLength));
}

// Int16

function _getInt16ArrayBuffer(buffer){
	var byteOffset = this.genericBuffer.offset,
			byteLength = this.genericBuffer.length;
	
	this.callbacks.pop().call(this,new Int16Array(buffer,byteOffset,byteLength/2));
}

// Int32

function _getInt32ArrayBuffer(buffer){
	var byteOffset = this.genericBuffer.offset,
			byteLength = this.genericBuffer.length;
	
	this.callbacks.pop().call(this,new Int32Array(buffer,byteOffset,byteLength/4));
}

// Float32

function _getFloat32ArrayBuffer(buffer){
	var byteOffset = this.genericBuffer.offset,
			byteLength = this.genericBuffer.length;
	
	this.callbacks.pop().call(this,new Float32Array(buffer,byteOffset,byteLength/4));
}

// Float64

function _getFloat64ArrayBuffer(buffer){
	var byteOffset = this.genericBuffer.offset,
			byteLength = this.genericBuffer.length;
	
	this.callbacks.pop().call(this,new Float64Array(buffer,byteOffset,byteLength/8));
}

// DataView

function _getDataViewArrayBuffer(buffer){
	var byteOffset = this.genericBuffer.offset,
			byteLength = this.genericBuffer.length;
	
	this.callbacks.pop().call(this,new DataView(buffer,byteOffset,byteLength));
}

// BackReference

function _getBackReferenceIndex(i){
	this.callbacks.pop().call(this,this.backReferences[i]);
}

// Array

function _getArraySize(size){
	var array = [];
	
	array._index = 0;
	
	this.backReferences.push(array);
	if(size > 0){
		this.sizeBuffer.push(size);
		this.unpack(_getArrayNextElement);
	}else this.callbacks.pop().call(this,this.backReferences.pop());
}

function _getArrayNextElement(element){
	var array = this.backReferences[this.backReferences.length - 1];
	if(element != nothing) array[array._index] = element;
	array._index++;
	if(array._index == this.sizeBuffer[this.sizeBuffer.length - 1]){
		delete array._index;
		this.sizeBuffer.pop();
		this.callbacks.pop().call(this,this.backReferences.pop());
	}else this.unpack(_getArrayNextElement);
}

// Object

function _getObjectSize(size){
	this.backReferences.push({});
	if(size > 0){
		this.sizeBuffer.push(size);
		this.callbacks.push(_getObjectKey);
		this.read(1,_startStringUnpack);
	}else this.callbacks.pop().call(this,this.backReferences.pop());
}

function _getObjectKey(key){
	this.keyBuffer.push(key);
	this.unpack(_getObjectNextElement);
}

function _getObjectNextElement(element){
	this.backReferences[this.backReferences.length - 1][this.keyBuffer.pop()] = element;
	if(--this.sizeBuffer[this.sizeBuffer.length - 1] == 0){
		this.sizeBuffer.pop();
		this.callbacks.pop().call(this,this.backReferences.pop());
	}else{
		this.callbacks.push(_getObjectKey);
		this.read(1,_startStringUnpack);
	}
}

// Chunk

function _getChunkHash(hash){
	this.genericBuffer = {hash: hash};
	this.unpack(_getChunkStart);
}

function _getChunkStart(start){
	this.genericBuffer.start = start;
	
	if(start == 0) this.unpack(_getChunkMetadata);
	else this.unpack(_getChunkEnd);
}

function _getChunkMetadata(metadata){
	this.genericBuffer.metadata = metadata;
	this.unpack(_getChunkTotal);
}

function _getChunkTotal(total){
	this.genericBuffer.total = total;
	this.unpack(_getChunkEnd);
}

function _getChunkEnd(end){
	this.genericBuffer.end = end;
	this.read(end - this.genericBuffer.start,_getChunk,'blob');
}

function _getChunk(blob){
	var chunk = new Chunk(blob,this.genericBuffer.start,
			this.genericBuffer.end,this.genericBuffer.hash,this.genericBuffer.metadata,
			this.genericBuffer.total);
	this.genericBuffer = undefined;
	this.callbacks.pop().call(this,chunk);
}

// Unpacker body

function _rawUnpack(type){
	type = type[0];
	
	// Very short integers
	if(type >= 0xf0) return this.callbacks.pop().call(this,type & 0xf);
	if(type >= 0xe0) return this.callbacks.pop().call(this,-((type & 0xe) + 1));
	
	switch(type){
		
		// null / undefined
		case 0x00:
			return this.callbacks.pop().call(this,null);
		case 0x01:
			return this.callbacks.pop().call(this,undefined);
			
		// Boolean
		case 0x02:
			return this.callbacks.pop().call(this,false);
		case 0x03:
			return this.callbacks.pop().call(this,true);
		
		// Float
		case 0x04:
			return this.read(4,_float32unpack);
		case 0x05:
			return this.read(8,_float64unpack);
			
		// Unsigned int
		case 0x06:
			return this.read(1,_uint8unpack);
		case 0x07:
			return this.read(2,_uint16unpack);
		case 0x08:
			return this.read(4,_uint32unpack);
			
		// Int
		case 0x09:
			return this.read(1,_int8unpack);
		case 0x0a:
			return this.read(2,_int16unpack);
		case 0x0b:
			return this.read(4,_int32unpack);
			
		// String
		case 0x0c:
			return this.read(1,_startStringUnpack);
			
		// Date
		case 0x0d:
			return this.read(8,_dateUnpack);
		
		// File
		case 0x0e:
			this.callbacks.push(_getFileType);
			return this.read(1,_startStringUnpack);
		
		// Blob
		case 0x0f:
			this.callbacks.push(_getBlobType);
			return this.read(1,_startStringUnpack);
		
		// ArrayBuffer
		case 0x10:
			return this.unpack(_getArrayBufferSize);
		
		// ArrayBufferView
		case 0x11:
			this.callbacks.push(_getUint8ArrayBuffer);
			return this.unpack(_getArrayBufferLength);
		case 0x12:
			this.callbacks.push(_getUint16ArrayBuffer);
			return this.unpack(_getArrayBufferLength);
		case 0x13:
			this.callbacks.push(_getUint32ArrayBuffer);
			return this.unpack(_getArrayBufferLength);
		case 0x14:
			this.callbacks.push(_getInt8ArrayBuffer);
			return this.unpack(_getArrayBufferLength);
		case 0x15:
			this.callbacks.push(_getInt16ArrayBuffer);
			return this.unpack(_getArrayBufferLength);
		case 0x16:
			this.callbacks.push(_getInt32ArrayBuffer);
			return this.unpack(_getArrayBufferLength);
		case 0x17:
			this.callbacks.push(_getFloat32ArrayBuffer);
			return this.unpack(_getArrayBufferLength);
		case 0x18:
			this.callbacks.push(_getFloat64ArrayBuffer);
			return this.unpack(_getArrayBufferLength);
		
		// DataView
		case 0x19:
			this.callbacks.push(_getDataViewArrayBuffer);
			return this.unpack(_getArrayBufferLength);
		
		// Back reference
		case 0x1a:
			return this.unpack(_getBackReferenceIndex);
		
		// Array
		case 0x1b:
			return this.unpack(_getArraySize);
		
		// Object
		case 0x1c:
			return this.unpack(_getObjectSize);
		
		// Nothing
		case 0x1d:
			return this.callbacks.pop().call(this,nothing);
		
		// Chunk
		case 0x1e:
			return this.unpack(_getChunkHash);
	}
}

Unpacker.prototype.unpack = function(callback){
	this.callbacks.push(callback);
	this.read(1,_rawUnpack);
}

//--------//
// PACKER //
//--------//

function Packer(){
	this.bufferBuilder = new BufferBuilder();
	this.backReferences = [];
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
				if(value.constructor == Object) return this.pack_object(value);
				if(value instanceof Array) return this.pack_array(value);
				if(value instanceof Date) return this.pack_date(value);
				
				
				if(value instanceof Chunk) return this.pack_chunk(value);
				
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
					return this.pack_object(value);
				}
				
				return this.pack_object(value);
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
	else this.pack_float64(file.lastModified);
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
	this.pack(buffer.byteLength);
	this.bufferBuilder.append(buffer);
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

Packer.prototype.pack_array = function(array){
	this.bufferBuilder.append(Uint8ToBuffer(0x1b));
	this.pack(array.length);
	
	this.backReferences.push(array);
	
	var j;
	for(var i = 0; i < array.length ; i++){
		
		if(!(i in array)){
			this.bufferBuilder.append(Uint8ToBuffer(0x1d));
			continue;
		}
		
		if((j = this.backReferences.indexOf(array[i])) != -1){
			this.bufferBuilder.append(Uint8ToBuffer(0x1a));
			this.pack(j);
			continue;
		}
		
		this.pack(array[i]);
	}
	
	this.backReferences.pop();
}

// Object

Packer.prototype.pack_object = function(obj){
	this.bufferBuilder.append(Uint8ToBuffer(0x1c));
	this.pack_raw_object(obj);
}

Packer.prototype.pack_raw_object = function(obj){
	this.pack(Object.keys(obj).length);
	
	this.backReferences.push(obj);
	
	var j;
	for(var i in obj){
		if(!obj.hasOwnProperty(i)) continue;
		
		this.pack_raw_string(i);
		
		if((j = this.backReferences.indexOf(obj[i])) != -1){
			this.bufferBuilder.append(Uint8ToBuffer(0x1a));
			this.pack(j);
			continue;
		}
		
		this.pack(obj[i]);
	}
	
	this.backReferences.pop();
}

// Int

Packer.prototype.pack_integer = function(num){
	if(num >= 0){
		if(num <= 15){
			this.bufferBuilder.append(Uint8ToBuffer(0xf0 | num));
		}else if(toUint8(num) == num){
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
		if(num >= -16){
			num = (-num) - 1;
			this.bufferBuilder.append(Uint8ToBuffer(0xe0 | num));
		}else if(toInt8(num) == num){
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

// Chunk

Packer.prototype.pack_chunk = function(chunk){
	this.bufferBuilder.append(Uint8ToBuffer(0x1e));
	this.pack(chunk.hash);
	this.pack(chunk.start);
	if(chunk.start == 0){
		var packer = new Packer();
		packer.pack(chunk.metadata);
		var buffer = packer.getBuffer();
		
		if(buffer.size > 500){
			console.warn('Warning: chunk metadata too large');
			this.pack(undefined);
		}else{
			this.bufferBuilder.append(buffer);
		}
		
		this.pack(chunk.total);
	}
	this.pack(chunk.end);
	
	this.bufferBuilder.append(chunk.data);
}

//--------------------//
// AUXILIAR FUNCTIONS //
//--------------------//

// Float64

var _float64Buffer = new Uint8Array(8);
var _float64Interpreter = new Float64Array(_float64Buffer.buffer);

function bytesToFloat64(bytes){
	_float64Buffer.set(bytes);
	return _float64Interpreter[0];
}

function float64ToBuffer(num){
	_float64Interpreter[0] = num;
	var buffer = _float64Interpreter.buffer.slice(0);
	masterClock.after(0,eraseBuffer,this,[buffer]);
	return buffer;
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
	var buffer = _float32Interpreter.buffer.slice(0);
	masterClock.after(0,eraseBuffer,this,[buffer]);
	return buffer;
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
	var buffer = _int32Interpreter.buffer.slice(0);
	masterClock.after(0,eraseBuffer,this,[buffer]);
	return buffer;
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
	var buffer = _Uint32Interpreter.buffer.slice(0);
	masterClock.after(0,eraseBuffer,this,[buffer]);
	return buffer;
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
	var buffer = _int16Interpreter.buffer.slice(0);
	masterClock.after(0,eraseBuffer,this,[buffer]);
	return buffer;
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
	var buffer = _Uint16Interpreter.buffer.slice(0);
	masterClock.after(0,eraseBuffer,this,[buffer]);
	return buffer;
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
	var buffer = _int8Interpreter.buffer.slice(0);
	masterClock.after(0,eraseBuffer,this,[buffer]);
	return buffer;
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
	var buffer = _Uint8Buffer.buffer.slice(0);
	masterClock.after(0,eraseBuffer,this,[buffer]);
	return buffer;
}

function toUint8(num){
	_Uint8Buffer[0] = num;
	return _Uint8Buffer[0];
}

//--------//
// CHUNKS //
//--------//

function Chunk(data,start,end,hash,metadata,size){
	this.data = data;
	
	this.start = start;
	this.end = end;
	
	this.hash = hash;
	
	this.total = size;
	this.metadata = metadata;
}

// Chunker

function Chunker(blob,hash,metadata){
	this.blob = blob;
	
	this.index = 0;
	this.complete = 0;
	
	this.hash = hash;
	this.metadata = metadata;
}

Chunker.prototype.getNextChunk = function(size){
	if(this.complete >= 1) return false;
	var start = this.index,
			subBlob = this.blob.slice(this.index,this.index = Math.min(this.blob.size,this.index + size));
	this.complete = this.index / this.blob.size;
	return new Chunk(subBlob,start,this.index,this.hash,this.metadata,this.blob.size);
};

// Joiner

function Joiner(){
	this.result = [];
	
	this.index = 0;
	this.complete = 0;
	
	this.buffer = {
		pointers: [],
		chunks: []
	};
}

Joiner.prototype.addChunk = function(chunk){
	
	if(this.complete >= 1) return false;
	
	if(chunk.start == 0){
		this.total = chunk.total;
		this.metadata = chunk.metadata;
	}
	
	if(chunk.start != this.index){
		this.buffer.pointers.push(chunk.start);
		this.buffer.chunks.push(chunk);
		return true;
	}
	
	this.result.push(chunk.data);
	this.index = chunk.end;
	
	this.complete = this.index / this.total;
	if(this.complete == 1) this.result = new Blob(this.result);
	
	var i;
	if((i = this.buffer.pointers.indexOf(this.index)) != -1){
		this.buffer.pointers.splice(i,1);
		var nextChunk = this.buffer.chunks.splice(i,1)[0];
		return this.addChunk(nextChunk);
	}
	
	return true;
}

//---------------------//
// ARRAYBUFFER TO BLOB //
//---------------------//

var _blober = (function(){
	
	if(!(window.requestFileSystem || window.webkitRequestFileSystem || window.mozRequestFileSystem || window.moz_requestFileSystem)){
		
		return function(ab,cb,that){
			var obj = that || {};
			masterClock.after(0,cb,obj,[new Blob([ab])]);
			return obj;
		};
	}
	
	var eraser = URL.createObjectURL(new Blob([
				'self.requestFileSystemSync = self.webkitRequestFileSystemSync' +
																			'|| self.moz_requestFileSystemSync' +
																			'|| self.mozRequestFileSystemSync' +
																			'|| self.requestFileSystemSync;' +
				'requestFileSystemSync(TEMPORARY,500).' +
				'root.getDirectory(".BinaryPack",{create: true}).' +
				'removeRecursively();' +
				'self.close();'
			],{type: 'text/javascript'})),
			file = URL.createObjectURL(new Blob([
				'self.onmessage = function(e){' +
					'var b = new Blob([e.data]);' +
					'self.requestFileSystemSync = self.webkitRequestFileSystemSync' +
																				'|| self.moz_requestFileSystemSync' +
																				'|| self.mozRequestFileSystemSync' +
																				'|| self.requestFileSystemSync;' +
					'var file = 	requestFileSystemSync(TEMPORARY,b.size + 500).' +
												'root.getDirectory(".BinaryPack",{create: true}).' +
												'getFile(Date.now().toString(),{create: true});'	+
					'file.createWriter().write(b);' + 
					'postMessage(file.file());'	+
					'self.close();' +
				'};'
			],{type: 'text/javascript'}));
	
	var wd = new Worker(eraser);
	URL.revokeObjectURL(eraser);
	
	function _onData(e){
		this._cb.call(this._that,e.data);
	}
	
	return function(ab,callback,that){
		var w = new Worker(file);
		w.onmessage = _onData;
		w._cb = callback;
		w._that = that || w;
		w.postMessage(ab,[ab]);
		return w;
	};
})();

//--------------------//
// ARRAYBUFFER ERASER //
//--------------------//

var _garbageCollector = (function(){
	var ef = URL.createObjectURL(new Blob([''],{type: 'text/javascript'})),
			w = new Worker(ef);
	
	URL.revokeObjectURL(ef);
	return w;
})();

function eraseBuffer(ab){
	_garbageCollector.postMessage(ab,[ab]);
}

//---------//
// EXPORTS //
//---------//

exports.BinaryPack = {
	after: masterClock.after.bind(masterClock),
	getBlob: _blober,
	Chunker: Chunker,
	Joiner: Joiner,
	free: eraseBuffer,
	isChunk: function(data){
		return data instanceof Chunk;
	},
	unpack: function(data,callback){
		var unpacker = new Unpacker(data);
		unpacker.unpack(callback);
	},
	maxRAM: 1e3,
	pack: function(data){
		var packer = new Packer();
		packer.pack(data);
		var buffer = packer.getBuffer();
		return buffer;
	}
};

})(this);
