import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { APP_CONFIG, AppConfig } from '../config/config';

@Injectable()
export class PrivateStorageService {
  private readonly client?:SupabaseClient;
  constructor(@Inject(APP_CONFIG) private readonly config:AppConfig) {
    if(config.supabaseUrl&&config.storageKey)this.client=createClient(config.supabaseUrl,config.storageKey,{
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
      global:{fetch:(input,init)=>fetch(input,{...init,redirect:'error',signal:AbortSignal.timeout(5000)})},
    });
  }
  private unavailable():never{throw new ServiceUnavailableException({code:'STORAGE_UNAVAILABLE'});}
  async upload(path:string,bytes:Buffer,mime:string) {
    if(!this.client)this.unavailable();
    try {
      const bucket=await this.client.storage.getBucket(this.config.receiptBucket);
      if(bucket.error || bucket.data.public!==false)this.unavailable();
      const upload=await this.client.storage.from(this.config.receiptBucket).upload(path,bytes,{contentType:mime,upsert:false,cacheControl:'0'});
      if(upload.error)this.unavailable();
    }catch{this.unavailable();}
  }
  async remove(path:string) {
    if(!this.client)this.unavailable();
    try {
      const result=await this.client.storage.from(this.config.receiptBucket).remove([path]);
      if(result.error)this.unavailable();
    }catch{this.unavailable();}
  }
  async download(path:string):Promise<{bytes:Buffer;mime:string;extension:string}> {
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
