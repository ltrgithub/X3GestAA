declare namespace NodeJS {
    export interface Domain extends Events {
        bind(_: Streamline._): any;
    }
}
declare module "zlib" {
    import { _ } from "streamline-runtime";
    import * as stream from "stream";
    export function deflate(buf: Buffer, _: _ ): any;
    export function deflateRaw(buf: Buffer, _: _ ): any;
    export function gzip(buf: Buffer, _: _ ): any;
    export function gunzip(buf: Buffer, _: _ ): any;
    export function inflate(buf: Buffer, _: _ ): any;
    export function inflateRaw(buf: Buffer, _: _ ): any;
    export function unzip(buf: Buffer, _: _ ): any;
}
declare module "readline" {
    import { _ } from "streamline-runtime";
    import * as events from "events";
    import * as stream from "stream";
    export interface Completer {
        (line: string, _: _): CompleterResult;
    }
}
declare module "child_process" {
    import { _ } from "streamline-runtime";
    import * as events from "events";
    import * as stream from "stream";
    export function exec(command: string, _?: _ ): string;
    export function exec(command: string, _?: [_] ): [string, string];
    export function exec(command: string, options: ExecOptionsWithStringEncoding, _?: _ ): string;
    export function exec(command: string, options: ExecOptionsWithStringEncoding, _?: [_] ): [string, string];
    export function exec(command: string, options: ExecOptionsWithBufferEncoding, _?: _ ): Buffer;
    export function exec(command: string, options: ExecOptionsWithBufferEncoding, _?: [_] ): [Buffer, Buffer];
    export function exec(command: string, options: ExecOptions, _?: _ ): string;
    export function exec(command: string, options: ExecOptions, _?: [_] ): [string, string];
    export function execFile(file: string, _?: _ ): string;
    export function execFile(file: string, _?: [_] ): [string, string];
    export function execFile(file: string, options?: ExecFileOptionsWithStringEncoding, _?: _ ): string;
    export function execFile(file: string, options?: ExecFileOptionsWithStringEncoding, _?: [_] ): [string, string];
    export function execFile(file: string, options?: ExecFileOptionsWithBufferEncoding, _?: _ ): Buffer;
    export function execFile(file: string, options?: ExecFileOptionsWithBufferEncoding, _?: [_] ): [Buffer, Buffer];
    export function execFile(file: string, options?: ExecFileOptions, _?: _ ): string;
    export function execFile(file: string, options?: ExecFileOptions, _?: [_] ): [string, string];
    export function execFile(file: string, args?: string[], _?: _ ): string;
    export function execFile(file: string, args?: string[], _?: [_] ): [string, string];
    export function execFile(file: string, args?: string[], options?: ExecFileOptionsWithStringEncoding, _?: _ ): string;
    export function execFile(file: string, args?: string[], options?: ExecFileOptionsWithStringEncoding, _?: [_] ): [string, string];
    export function execFile(file: string, args?: string[], options?: ExecFileOptionsWithBufferEncoding, _?: _ ): Buffer;
    export function execFile(file: string, args?: string[], options?: ExecFileOptionsWithBufferEncoding, _?: [_] ): [Buffer, Buffer];
    export function execFile(file: string, args?: string[], options?: ExecFileOptions, _?: _ ): string;
    export function execFile(file: string, args?: string[], options?: ExecFileOptions, _?: [_] ): [string, string];
}
declare module "dns" {
    import { _ } from "streamline-runtime";
    export function lookup(domain: string, family: number, _: _ ): string;
    export function lookup(domain: [string, number], family: number, _: [_] ): string;
    export function lookup(domain: string, _: _ ): string;
    export function lookup(domain: [string, number], _: [_] ): string;
    export function resolve(domain: string, rrtype: string, _: _ ): string[];
    export function resolve(domain: string, _: _ ): string[];
    export function resolve4(domain: string, _: _ ): string[];
    export function resolve6(domain: string, _: _ ): string[];
    export function resolveMx(domain: string, _: _ ): string[];
    export function resolveTxt(domain: string, _: _ ): string[];
    export function resolveSrv(domain: string, _: _ ): string[];
    export function resolveNs(domain: string, _: _ ): string[];
    export function resolveCname(domain: string, _: _ ): string[];
    export function reverse(ip: string, _: _ ): string[];
}
declare module "net" {
    import { _ } from "streamline-runtime";
    import * as stream from "stream";
    export interface Server extends Socket {
        getConnections(_: _): number;
    }
}
declare module "dgram" {
    import { _ } from "streamline-runtime";
    import * as events from "events";
    interface Socket extends events.EventEmitter {
        send(buf: Buffer, offset: number, length: number, port: number, address: string, _?: _): number;
    }
}
declare module "fs" {
    import { _ } from "streamline-runtime";
    import * as stream from "stream";
    import * as events from "events";
    export function rename(oldPath: string, newPath: string, _?: _): void;
    export function truncate(path: string | Buffer, _?: _): void;
    export function truncate(path: string | Buffer, len: number, _?: _): void;
    export function ftruncate(fd: number, _?: _): void;
    export function ftruncate(fd: number, len: number, _?: _): void;
    export function chown(path: string | Buffer, uid: number, gid: number, _?: _): void;
    export function fchown(fd: number, uid: number, gid: number, _?: _): void;
    export function lchown(path: string | Buffer, uid: number, gid: number, _?: _): void;
    export function chmod(path: string | Buffer, mode: number, _?: _): void;
    export function chmod(path: string | Buffer, mode: string, _?: _): void;
    export function fchmod(fd: number, mode: number, _?: _): void;
    export function fchmod(fd: number, mode: string, _?: _): void;
    export function lchmod(path: string | Buffer, mode: number, _?: _): void;
    export function lchmod(path: string | Buffer, mode: string, _?: _): void;
    export function stat(path: string | Buffer, _?: _): Stats;
    export function lstat(path: string | Buffer, _?: _): Stats;
    export function fstat(fd: number, _?: _): Stats;
    export function link(srcpath: string | Buffer, dstpath: string | Buffer, _?: _): void;
    export function symlink(srcpath: string | Buffer, dstpath: string | Buffer, type?: string, _?: _): void;
    export function readlink(path: string | Buffer, _?: _): string;
    export function realpath(path: string | Buffer, _?: _): string;
    export function realpath(path: string | Buffer, cache: {[path: string]: string}, _: _): string;
    export function unlink(path: string | Buffer, _?: _): void;
    export function rmdir(path: string | Buffer, _?: _): void;
    export function mkdir(path: string | Buffer, _?: _): void;
    export function mkdir(path: string | Buffer, mode: number, _?: _): void;
    export function mkdir(path: string | Buffer, mode: string, _?: _): void;
    export function mkdtemp(prefix: string, _?: _): string;
    export function readdir(path: string | Buffer, _?: _): string[];
    export function close(fd: number, _?: _): void;
    export function open(path: string | Buffer, flags: string, _?: _): number;
    export function open(path: string | Buffer, flags: string, mode: number, _?: _): number;
    export function open(path: string | Buffer, flags: string, mode: string, _?: _): number;
    export function utimes(path: string | Buffer, atime: number, mtime: number, _?: _): void;
    export function utimes(path: string | Buffer, atime: Date, mtime: Date, _?: _): void;
    export function futimes(fd: number, atime: number, mtime: number, _?: _): void;
    export function futimes(fd: number, atime: Date, mtime: Date, _?: _): void;
    export function fsync(fd: number, _?: _): void;
    export function write(fd: number, buffer: Buffer, offset: number, length: number, position: number, _?: _): number;
    export function write(fd: number, buffer: Buffer, offset: number, length: number, position: number, _?: [_]): [number, Buffer];
    export function write(fd: number, buffer: Buffer, offset: number, length: number, _?: _): number;
    export function write(fd: number, buffer: Buffer, offset: number, length: number, _?: [_]): [number, Buffer];
    export function write(fd: number, data: any, _?: _): number;
    export function write(fd: number, data: any, _?: [_]): [number, string];
    export function write(fd: number, data: any, offset: number, _?: _): number;
    export function write(fd: number, data: any, offset: number, _?: [_]): [number, string];
    export function write(fd: number, data: any, offset: number, encoding: string, _?: _): number;
    export function write(fd: number, data: any, offset: number, encoding: string, _?: [_]): [number, string];
    export function read(fd: number, buffer: Buffer, offset: number, length: number, position: number, _?: _): number;
    export function read(fd: number, buffer: Buffer, offset: number, length: number, position: number, _?: [_]): [number, Buffer];
    export function readFile(filename: string, encoding: string, _: _): string;
    export function readFile(filename: string, options: { encoding: string; flag?: string; }, _: _): string;
    export function readFile(filename: string, options: { flag?: string; }, _: _): Buffer;
    export function readFile(filename: string, _: _): Buffer;
    export function writeFile(filename: string, data: any, _?: _): void;
    export function writeFile(filename: string, data: any, options: { encoding?: string; mode?: number; flag?: string; }, _?: _): void;
    export function writeFile(filename: string, data: any, options: { encoding?: string; mode?: string; flag?: string; }, _?: _): void;
    export function appendFile(filename: string, data: any, options: { encoding?: string; mode?: number; flag?: string; }, _?: _): void;
    export function appendFile(filename: string, data: any, options: { encoding?: string; mode?: string; flag?: string; }, _?: _): void;
    export function appendFile(filename: string, data: any, _?: _): void;
    export function access(path: string | Buffer, _: _): void;
    export function access(path: string | Buffer, mode: number, _: _): void;
    export function exists(path: string | Buffer, _: _, __: _): boolean;
}
declare module "crypto" {
    import { _ } from "streamline-runtime";
    export function pbkdf2(password: string|Buffer, salt: string|Buffer, iterations: number, keylen: number, _: _): Buffer;
    export function pbkdf2(password: string|Buffer, salt: string|Buffer, iterations: number, keylen: number, digest: string, _: _): Buffer;
    export function randomBytes(size: number, _: _ ): Buffer;
    export function pseudoRandomBytes(size: number, _: _ ): Buffer;
}
declare module "domain" {
    import { _ } from "streamline-runtime";
    import * as events from "events";
    export interface Domain extends events.EventEmitter {
        bind(_: _): any;
    }
}