import * as zlib from 'zlib';
import * as javaDeserialization from 'java-deserialization';
//import phpSerialize from 'php-serialize';
import * as msgpack from 'algo-msgpack-with-bigint';
import { isNull } from './object-util';
import { util } from 'protobufjs';

/**
 * msgpack:二进制的json数据，数据更小
 * hex：16进制的数据格式
 * binary：2进制的数据格式
 */

export class DataUtil {
  public static isJSON(string): boolean {
    try {
      let obj = JSON.parse(string);
      return !!obj && typeof obj === 'object';
    } catch (e) {}

    return false;
  }

  // public static isPHPSerialize(str) {
  //   try {
  //     phpSerialize.unserialize(str);
  //     return true;
  //   } catch (e) {
  //   }
  //
  //   return false;
  // }

  public static isJavaSerialize(str) {
    try {
      javaDeserialization.parse(str);
      return true;
    } catch (e) {}

    return false;
  }

  public static isMsgpack(buf: Buffer) {
    const decode = msgpack.decode;

    try {
      const result = decode(buf);
      if (['object', 'string'].includes(typeof result)) {
        return true;
      }
    } catch (e) {}

    return false;
  }

  public static isBrotli(buf) {
    return typeof this.zippedToString(buf, 'brotli') === 'string';
  }

  public static isGzip(buf) {
    return typeof this.zippedToString(buf, 'gzip') === 'string';
  }

  public static isDeflate(buf) {
    return typeof this.zippedToString(buf, 'deflate') === 'string';
  }

  // public static isProtobuf(buf) {
  //   // fix #859, #880, exclude number type
  //   if (!isNaN(buf)) {
  //     return false;
  //   }
  //   const getData = rawproto.getData;
  //   try {
  //     const result = getData(buf);
  //
  //     // fix #922 some str mismatch
  //     if (result[0]) {
  //       let firstEle = Object.values(result[0])[0];
  //       // if (firstEle < 1e-14 || firstEle.low) {
  //       //   return false;
  //       // }
  //     }
  //     return true;
  //   } catch (e) {
  //   }
  //
  //   return false;
  // }

  public static bufVisible(buf) {
    if (typeof buf == 'string') {
      return true;
    }
    return buf.equals(Buffer.from(buf.toString()));
  }

  public static bufToString(buf, forceHex = false): string {
    // if (typeof buf == 'string') {
    //   return buf;
    // }
    //console.log('------>start',buf.toString())

    if (!Buffer.isBuffer(buf)) {
      return buf;
    }

    if (!forceHex && DataUtil.bufVisible(buf)) {
      return buf.toString();
    }

    return this.bufToHex(buf);
  }

  public static bufToQuotation(buf) {
    const str = this.bufToString(buf).replaceAll('"', '\\"');
    return `"${str}"`;
  }

  public static bufToHex(buf): string {
    let result = buf.toJSON().data.map((item) => {
      if (item >= 32 && item <= 126) {
        return String.fromCharCode(item);
      }
      return '\\x' + item.toString(16).padStart(2, 0);
    });

    return result.join('');
  }

  public static bufToHexOX(buf): string {
    if (Buffer.isBuffer(buf)) {
      return '0x' + buf.toString('hex');
    }
    return buf;
  }

  public static bufToBit(buf): string {
    let result = buf.toJSON().data.map((item) => {
      return item.toString(2).padStart(8, 0);
    });
    return result.join('');
  }

  public static xToBuffer(str) {
    let result = '';

    for (let i = 0; i < str.length; ) {
      if (str.substr(i, 2) == '\\x') {
        result += str.substr(i + 2, 2);
        i += 4;
      } else {
        result += Buffer.from(str[i++]).toString('hex');
      }
    }

    return Buffer.from(result, 'hex');
  }

  public static bufToBinary(buf): string {
    let binary = '';

    for (let item of buf) {
      binary += item.toString(2).padStart(8, 0);
    }

    return binary;
  }

  public static binaryStringToBuffer(str) {
    const groups = str.match(/[01]{8}/g);
    const numbers = groups.map((binary) => parseInt(binary, 2));
    return Buffer.from(new Uint8Array(numbers));
  }

  public static bufferToJava(buf: Buffer): Object {
    const deserialized = javaDeserialization.parse(buf);
    //console.log('bufferToJava', deserialized);
    return deserialized;
  }

  public static msgpackToBuffer(str: string): Buffer {
    //console.log('msg to buffer->', str);
    const encoded: Uint8Array = msgpack.encode(str);
    return Buffer.from(encoded);
  }

  public static bufferToMsgpack(buf: Buffer): string {
    const deserialized = msgpack.decode(buf);
    return deserialized as string;
  }

  public static bufferToProtobuf(buf: Buffer): string {
    //const deserialized = rawproto.getData(buf);
    //console.log('bufferToProtobuf:', deserialized)
    //return deserialized as string;
    return '';
  }

  public static cutString(string, maxLength = 20) {
    if (string.length <= maxLength) {
      return string;
    }

    return string.substr(0, maxLength) + '...';
  }

  public static zippedToString(buf, type = 'unzip') {
    const funMap = {
      // unzip will automatically detect Gzip or Deflate header
      unzip: 'unzipSync',
      gzip: 'gunzipSync',
      deflate: 'inflateSync',
      brotli: 'brotliDecompressSync',
    };

    try {
      const decompressed = zlib[funMap[type]](buf);

      if (Buffer.isBuffer(decompressed) && decompressed.length) {
        return decompressed.toString();
      }
    } catch (e) {}

    return false;
  }

  public static base64Encode(str) {
    return Buffer.from(str, 'utf8').toString('base64');
  }

  public static base64Decode(str) {
    return Buffer.from(str, 'base64').toString('utf8');
  }

  public static dataFormat = (origin: any) => {
    if (isNull(origin)) {
      return origin;
    }
    if (origin.hasOwnProperty('type')) {
      //console.log('buffer-->', DataDealUtil.bufToString(origin), ';',
      // DataDealUtil.bufToString(origin.data), ';',
      //DataDealUtil.bufVisible(origin.data),';',
      // origin.data.toString())
      //return String.fromCharCode.apply(null, [...new Uint16Array(origin.data)]);
      return origin.data.toString();
    }
    return origin;
  };

  // public static  humanFileSize(size = 0) {
  //   if (!size) {
  //     return 0;
  //   }
  //   let i = Math.floor(Math.log(size) / Math.log(1024));
  //   return (size / Math.pow(1024, i)).toFixed(2) * 1 + ['B', 'kB', 'MB', 'GB', 'TB'][i];
  // }
  // public static  cloneObjWithBuff(object) {
  //   let clone = JSON.parse(JSON.stringify(object));
  //
  //   for (let i in clone) {
  //     if ((typeof clone[i] === 'object') && (clone[i].type === 'Buffer')) {
  //       clone[i] = Buffer.from(clone[i]);
  //     }
  //   }
  //
  //   return clone;
  // }
}
