import { HttpException } from '@nestjs/common';
import { Request } from 'express';
import { AppConfig } from '../config/config';

export function guestCookieName(config:AppConfig) {
  return ['production','staging'].includes(config.environment)?'__Host-sorteos_guest':'sorteos_guest';
}
export function guestSecret(request:Request,config:AppConfig):string|undefined {
  const name=guestCookieName(config);
  const values=(request.headers.cookie??'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(`${name}=`));
  return values.length===1?values[0]!.slice(name.length+1):undefined;
}
export function assertCheckoutOrigin(request:Request,config:AppConfig) {
  if(!request.headers.origin || !config.corsOrigins.includes(request.headers.origin)
    || request.headers['sec-fetch-site']==='cross-site')throw new HttpException({code:'FORBIDDEN'},403);
}
