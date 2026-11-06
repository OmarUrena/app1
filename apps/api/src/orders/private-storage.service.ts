import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { APP_CONFIG, AppConfig } from '../config/config';
import { fetchFromServer } from '../common/server-fetch';
import { lstat, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

@Injectable()
export class PrivateStorageService {
  private readonly client?:SupabaseClient;
  constructor(@Inject(APP_CONFIG) private readonly config:AppConfig) {
    if(config.supabaseUrl&&config.storageKey)this.client=createClient(config.supabaseUrl,config.storageKey,{
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
      global:{fetch:(input,init)=>fetchFromServer(input,{...init,redirect:'error',signal:AbortSignal.timeout(5000)})},
    });
  }
  private unavailable():never{throw new ServiceUnavailableException({code:'STORAGE_UNAVAILABLE'});}
  private async localPath(path:string){
    if(!this.config.developmentLocalReceipts||!['development','test'].includes(this.config.environment)
      ||!/^pending\/[a-f0-9-]{36}\.(png|jpg|pdf)$/.test(path))this.unavailable();
    const root=resolve(__dirname,'../../../../.tmp/development-receipts');
    await mkdir(resolve(root,'..'),{recursive:true,mode:0o700});
    if((await lstat(resolve(root,'..'))).isSymbolicLink())this.unavailable();
    await mkdir(root,{recursive:true,mode:0o700});
    if((await lstat(root)).isSymbolicLink())this.unavailable();
    await mkdir(resolve(root,'pending'),{recursive:true,mode:0o700});
    if((await lstat(resolve(root,'pending'))).isSymbolicLink())this.unavailable();
    const file=resolve(root,path);
    try{if((await lstat(file)).isSymbolicLink())this.unavailable();}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    return file;
  }
  async upload(path:string,bytes:Buffer,mime:string) {
    if(this.config.developmentLocalReceipts){
      try{
        const extension=path.split('.').pop();
        if(bytes.length>this.config.receiptMaxBytes||({'png':'image/png','jpg':'image/jpeg','pdf':'application/pdf'} as Record<string,string>)[extension??'']!==mime)this.unavailable();
        await writeFile(await this.localPath(path),bytes,{flag:'wx',mode:0o600});return;
      }catch{this.unavailable();}
    }
    if(!this.client)this.unavailable();
    try {
      const bucket=await this.client.storage.getBucket(this.config.receiptBucket);
      if(bucket.error || bucket.data.public!==false)this.unavailable();
      const upload=await this.client.storage.from(this.config.receiptBucket).upload(path,bytes,{contentType:mime,upsert:false,cacheControl:'0'});
      if(upload.error)this.unavailable();
    }catch{this.unavailable();}
  }
  async remove(path:string) {
    if(this.config.developmentLocalReceipts){
      try{await unlink(await this.localPath(path));return;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return;this.unavailable();}
    }
    if(!this.client)this.unavailable();
    try {
      const result=await this.client.storage.from(this.config.receiptBucket).remove([path]);
      if(result.error)this.unavailable();
    }catch{this.unavailable();}
  }
  async download(path:string):Promise<{bytes:Buffer;mime:string;extension:string}> {
    if(this.config.developmentLocalReceipts){
      try{
        const file=await this.localPath(path),info=await lstat(file);
        if(!info.isFile()||info.size>this.config.receiptMaxBytes)this.unavailable();
        const bytes=await readFile(file),extension=path.split('.').pop()!;
        if(bytes.length>this.config.receiptMaxBytes)this.unavailable();
        const mime=({'png':'image/png','jpg':'image/jpeg','pdf':'application/pdf'} as Record<string,string>)[extension]!;
        return {bytes,mime,extension};
      }catch{this.unavailable();}
    }
    if(!this.client)this.unavailable();
    try {
      const bucket=await this.client.storage.getBucket(this.config.receiptBucket);
      if(bucket.error||bucket.data.public!==false)this.unavailable();
      const result=await this.client.storage.from(this.config.receiptBucket).download(path);
      if(result.error||!result.data||result.data.size>this.config.receiptMaxBytes)this.unavailable();
      const mime=result.data.type.split(';')[0]!;
      const extension=({'image/jpeg':'jpg','image/png':'png','application/pdf':'pdf'} as Record<string,string>)[mime];
      if(!extension)this.unavailable();
      return {bytes:Buffer.from(await result.data.arrayBuffer()),mime,extension};
    }catch{this.unavailable();}
  }
}
